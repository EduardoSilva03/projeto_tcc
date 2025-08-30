const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = 5000;
const SEGREDO_JWT = 'seu-segredo-super-secreto-para-jwt';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'empreendimentos',
  password: 'root',
  port: 5432,
});

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' });
    }

    jwt.verify(token, SEGREDO_JWT, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido.' });
        }
        req.usuarioId = decoded.id;
        next();
    });
};

app.get('/mobile-users', verificarToken, async (req, res) => {
    const adminId = req.usuarioId;
    try {
        const users = await pool.query(
            'SELECT id, nome, sobrenome, email, data_criacao FROM usuarios_mobile WHERE cadastrado_por_usuario_id = $1 ORDER BY nome ASC',
            [adminId]
        );
        res.status(200).json(users.rows);
    } catch (error) {
        console.error('Erro ao buscar usuários mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/mobile-users/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const adminId = req.usuarioId;
    try {
        const user = await pool.query(
            'SELECT id, nome, sobrenome, email FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [id, adminId]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }
        res.status(200).json(user.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar usuário mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/mobile-users/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const { nome, sobrenome, email } = req.body;
    const adminId = req.usuarioId;
    try {
        const result = await pool.query(
            'UPDATE usuarios_mobile SET nome = $1, sobrenome = $2, email = $3 WHERE id = $4 AND cadastrado_por_usuario_id = $5 RETURNING id',
            [nome, sobrenome, email, id, adminId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }
        res.status(200).json({ message: 'Dados do usuário atualizados com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar usuário mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.patch('/mobile-users/:id/password', verificarToken, async (req, res) => {
    const { id } = req.params;
    const { novaSenha } = req.body;
    const adminId = req.usuarioId;

    if (!novaSenha) {
        return res.status(400).json({ error: 'A nova senha é obrigatória.' });
    }

    try {
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(novaSenha, saltRounds);
        const result = await pool.query(
            'UPDATE usuarios_mobile SET senha_hash = $1 WHERE id = $2 AND cadastrado_por_usuario_id = $3 RETURNING id',
            [senhaHash, id, adminId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }
        res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar senha:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/cadastro-mobile', verificarToken, async (req, res) => {
    const { nome, sobrenome, email, senha } = req.body;
    const adminId = req.usuarioId;
    try {
        const usuarioExistente = await pool.query('SELECT * FROM usuarios_mobile WHERE email = $1', [email]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ error: 'Este e-mail já está em uso no sistema mobile.' });
        }
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(senha, saltRounds);
        const novoUsuario = await pool.query(
            'INSERT INTO usuarios_mobile (nome, sobrenome, email, senha_hash, cadastrado_por_usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email',
            [nome, sobrenome, email, senhaHash, adminId]
        );
        res.status(201).json({ message: 'Usuário mobile cadastrado com sucesso!', usuario: novoUsuario.rows[0] });
    } catch (error) {
        console.error('Erro no cadastro mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/cadastro', async (req, res) => {
  const { nome, sobrenome, email, senha } = req.body;
  try {
    const usuarioExistente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    const novoUsuario = await pool.query(
      'INSERT INTO usuarios (nome, sobrenome, email, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id, email',
      [nome, sobrenome, email, senhaHash]
    );
    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', usuario: novoUsuario.rows[0] });
  } catch (error) {
    console.error('Erro no cadastro web:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    const usuario = resultado.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    const token = jwt.sign(
        { id: usuario.id, email: usuario.email, nome: usuario.nome },
        SEGREDO_JWT,
        { expiresIn: '8h' }
    );
    res.status(200).json({
        message: `Login bem-sucedido! Bem-vindo, ${usuario.nome}.`,
        token: token
    });
  } catch (error) {
    console.error('Erro no login web:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

app.post('/login-mobile', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const resultado = await pool.query('SELECT * FROM usuarios_mobile WHERE email = $1', [email]);
        if (resultado.rows.length === 0) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }
        const usuario = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaCorreta) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }
        res.status(200).json({ message: `Login mobile bem-sucedido! Bem-vindo, ${usuario.nome}.`});
    } catch (error) {
        console.error('Erro no login mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
});