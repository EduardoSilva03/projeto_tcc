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
    console.error('Erro no cadastro:', error.message);
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