const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;
const SEGREDO_JWT = 'seu-segredo-super-secreto-para-jwt';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'empreendimentos',
  password: 'root',
  port: 5432,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const nomeUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + nomeUnico + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' });

    jwt.verify(token, SEGREDO_JWT, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Token inválido.' });
        req.usuarioId = decoded.id;
        next();
    });
};

app.post('/empresas', verificarToken, async (req, res) => {
    const { cnpj, razao_social, nome_fantasia, data_abertura, natureza_juridica, is_ativa } = req.body;
    const adminId = req.usuarioId;
    try {
        const cnpjExistente = await pool.query('SELECT id FROM empresas WHERE cnpj = $1', [cnpj]);
        if (cnpjExistente.rows.length > 0) return res.status(400).json({ error: 'Este CNPJ já está cadastrado.' });
        
        const novaEmpresa = await pool.query(
            'INSERT INTO empresas (usuario_id, cnpj, razao_social, nome_fantasia, data_abertura, natureza_juridica, is_ativa) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [adminId, cnpj, razao_social, nome_fantasia, data_abertura, natureza_juridica, is_ativa]
        );
        res.status(201).json(novaEmpresa.rows[0]);
    } catch (error) { console.error('Erro ao cadastrar empresa:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.get('/empresas', verificarToken, async (req, res) => {
    const adminId = req.usuarioId;
    try {
        const empresas = await pool.query('SELECT * FROM empresas WHERE usuario_id = $1 ORDER BY nome_fantasia ASC', [adminId]);
        res.status(200).json(empresas.rows);
    } catch (error) { console.error('Erro ao listar empresas:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.get('/empresas/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const adminId = req.usuarioId;
    try {
        const empresa = await pool.query('SELECT * FROM empresas WHERE id = $1 AND usuario_id = $2', [id, adminId]);
        if (empresa.rows.length === 0) return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' });
        res.status(200).json(empresa.rows[0]);
    } catch (error) { console.error('Erro ao buscar empresa:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.post('/empresas/:empresaId/imoveis', verificarToken, async (req, res) => {
    const { empresaId } = req.params;
    const adminId = req.usuarioId;
    const { nome_residencial, tipo_imovel, unidade, valor, cep, rua, numero, bairro, cidade, estado, complemento, link_google_maps, situacao, data_entrega_prevista, is_financiamento_liberado, financiamento_aceito } = req.body;
    try {
        const empresa = await pool.query('SELECT id FROM empresas WHERE id = $1 AND usuario_id = $2', [empresaId, adminId]);
        if (empresa.rows.length === 0) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });
        
        const novoImovel = await pool.query(
            `INSERT INTO imoveis (usuario_id, empresa_id, nome_residencial, tipo_imovel, unidade, valor, cep, rua, numero, bairro, cidade, estado, complemento, link_google_maps, situacao, data_entrega_prevista, is_financiamento_liberado, financiamento_aceito)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
            [adminId, empresaId, nome_residencial, tipo_imovel, unidade, valor, cep, rua, numero, bairro, cidade, estado, complemento, link_google_maps, situacao, data_entrega_prevista, is_financiamento_liberado, financiamento_aceito]
        );
        res.status(201).json(novoImovel.rows[0]);
    } catch (error) { console.error('Erro ao cadastrar imóvel:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.get('/empresas/:empresaId/imoveis', verificarToken, async (req, res) => {
    const { empresaId } = req.params;
    const adminId = req.usuarioId;
    try {
        const empresa = await pool.query('SELECT id FROM empresas WHERE id = $1 AND usuario_id = $2', [empresaId, adminId]);
        if (empresa.rows.length === 0) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });

        const imoveis = await pool.query('SELECT * FROM imoveis WHERE empresa_id = $1 ORDER BY nome_residencial', [empresaId]);
        res.status(200).json(imoveis.rows);
    } catch (error) { console.error('Erro ao listar imóveis:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.get('/imoveis/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const adminId = req.usuarioId;
    try {
        const imovelRes = await pool.query('SELECT * FROM imoveis WHERE id = $1 AND usuario_id = $2', [id, adminId]);
        if (imovelRes.rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado ou não pertence a você.' });

        const fotosRes = await pool.query('SELECT * FROM fotos_imoveis WHERE imovel_id = $1', [id]);
        const documentosRes = await pool.query('SELECT * FROM documentos WHERE imovel_id = $1', [id]);

        const imovel = imovelRes.rows[0];
        imovel.fotos = fotosRes.rows;
        imovel.documentos = documentosRes.rows;

        res.status(200).json(imovel);
    } catch (error) { console.error('Erro ao buscar imóvel:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.post('/imoveis/:id/fotos', verificarToken, upload.single('foto'), async (req, res) => {
    const { id: imovelId } = req.params;
    const { titulo } = req.body;
    const adminId = req.usuarioId;

    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de foto enviado.' });
    }

    const link_foto = `http://192.168.100.48:5000/uploads/${req.file.filename}`;

    try {
        const imovel = await pool.query('SELECT empresa_id FROM imoveis WHERE id = $1 AND usuario_id = $2', [imovelId, adminId]);
        if (imovel.rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado.' });
        const { empresa_id } = imovel.rows[0];

        const novaFoto = await pool.query(
            'INSERT INTO fotos_imoveis (imovel_id, empresa_id, usuario_id, link_foto, titulo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [imovelId, empresa_id, adminId, link_foto, titulo]
        );
        res.status(201).json(novaFoto.rows[0]);
    } catch (error) { 
        console.error('Erro ao adicionar foto:', error.message); 
        res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
});

app.post('/imoveis/:id/documentos', verificarToken, async (req, res) => {
    const { id: imovelId } = req.params;
    const { link_documento, titulo } = req.body;
    const adminId = req.usuarioId;
    try {
        const imovel = await pool.query('SELECT id FROM imoveis WHERE id = $1 AND usuario_id = $2', [imovelId, adminId]);
        if (imovel.rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado.' });

        const novoDoc = await pool.query(
            'INSERT INTO documentos (imovel_id, usuario_id, link_documento, titulo) VALUES ($1, $2, $3, $4) RETURNING *',
            [imovelId, adminId, link_documento, titulo]
        );
        res.status(201).json(novoDoc.rows[0]);
    } catch (error) { console.error('Erro ao adicionar documento:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.post('/cadastro-mobile', verificarToken, async (req, res) => {
    const { nome, sobrenome, email, senha } = req.body;
    const adminId = req.usuarioId;
    try {
        const usuarioExistente = await pool.query('SELECT * FROM usuarios_mobile WHERE email = $1', [email]);
        if (usuarioExistente.rows.length > 0) return res.status(400).json({ error: 'Este e-mail já está em uso.' });
        
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(senha, saltRounds);
        
        const novoUsuario = await pool.query(
            'INSERT INTO usuarios_mobile (nome, sobrenome, email, senha_hash, cadastrado_por_usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, nome',
            [nome, sobrenome, email, senhaHash, adminId]
        );
        res.status(201).json(novoUsuario.rows[0]);
    } catch (error) { console.error('Erro no cadastro mobile:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.get('/empresas/:empresaId/mobile-users', verificarToken, async (req, res) => {
    const { empresaId } = req.params;
    const adminId = req.usuarioId;
    try {
        const users = await pool.query(
            `SELECT um.* FROM usuarios_mobile um
             JOIN empresa_usuarios_mobile eum ON um.id = eum.usuario_id
             WHERE eum.empresa_id = $1 AND um.cadastrado_por_usuario_id = $2`,
            [empresaId, adminId]
        );
        res.status(200).json(users.rows);
    } catch (error) { console.error('Erro ao buscar usuários da empresa:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.get('/mobile-users/desvinculados/:empresaId', verificarToken, async (req, res) => {
    const { empresaId } = req.params;
    const adminId = req.usuarioId;
    try {
        const users = await pool.query(
            `SELECT * FROM usuarios_mobile um
             WHERE um.cadastrado_por_usuario_id = $1
             AND NOT EXISTS (
                SELECT 1 FROM empresa_usuarios_mobile eum
                WHERE eum.empresa_id = $2 AND eum.usuario_id = um.id
             )`,
            [adminId, empresaId]
        );
        res.status(200).json(users.rows);
    } catch (error) { console.error('Erro ao buscar usuários desvinculados:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.post('/empresas/:empresaId/vincular-usuario', verificarToken, async (req, res) => {
    const { empresaId } = req.params;
    const { usuario_mobile_id } = req.body;
    try {
        await pool.query(
            'INSERT INTO empresa_usuarios_mobile (empresa_id, usuario_id) VALUES ($1, $2)',
            [empresaId, usuario_mobile_id]
        );
        res.status(201).json({ message: 'Usuário vinculado com sucesso!' });
    } catch (error) { console.error('Erro ao vincular usuário:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.delete('/empresas/:empresaId/desvincular-usuario/:usuarioId', verificarToken, async (req, res) => {
    const { empresaId, usuarioId } = req.params;
    try {
        await pool.query(
            'DELETE FROM empresa_usuarios_mobile WHERE empresa_id = $1 AND usuario_id = $2',
            [empresaId, usuarioId]
        );
        res.status(200).json({ message: 'Usuário desvinculado com sucesso!' });
    } catch (error) { console.error('Erro ao desvincular usuário:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.post('/cadastro', async (req, res) => {
  const { nome, sobrenome, email, senha } = req.body;
  try {
    const usuarioExistente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (usuarioExistente.rows.length > 0) return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    const novoUsuario = await pool.query(
      'INSERT INTO usuarios (nome, sobrenome, email, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id, email',
      [nome, sobrenome, email, senhaHash]
    );
    res.status(201).json(novoUsuario.rows[0]);
  } catch (error) { console.error('Erro no cadastro web:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resultado.rows.length === 0) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    const usuario = resultado.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    const token = jwt.sign({ id: usuario.id, email: usuario.email, nome: usuario.nome }, SEGREDO_JWT, { expiresIn: '8h' });
    res.status(200).json({ message: `Login bem-sucedido!`, token: token });
  } catch (error) { console.error('Erro no login web:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.post('/login-mobile', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const resultado = await pool.query('SELECT * FROM usuarios_mobile WHERE email = $1', [email]);
        if (resultado.rows.length === 0) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        
        const usuario = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaCorreta) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });

        const token = jwt.sign({ id: usuario.id, email: usuario.email, tipo: 'mobile' }, SEGREDO_JWT, { expiresIn: '30d' });
        res.status(200).json({ message: `Login bem-sucedido!`, token: token });
    } catch (error) { console.error('Erro no login mobile:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.get('/mobile/minhas-empresas', verificarToken, async (req, res) => {
    const mobileUserId = req.usuarioId;
    try {
        const empresas = await pool.query(
            `SELECT e.* FROM empresas e
             JOIN empresa_usuarios_mobile eum ON e.id = eum.empresa_id
             WHERE eum.usuario_id = $1 AND e.is_ativa = true`,
            [mobileUserId]
        );
        res.status(200).json(empresas.rows);
    } catch (error) { console.error('Erro ao buscar empresas do mobile:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.get('/mobile/empresas/:id/imoveis', verificarToken, async (req, res) => {
    const { id: empresaId } = req.params;
    const mobileUserId = req.usuarioId;
    try {
        const acesso = await pool.query('SELECT * FROM empresa_usuarios_mobile WHERE empresa_id = $1 AND usuario_id = $2', [empresaId, mobileUserId]);
        if (acesso.rows.length === 0) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });

        const imoveis = await pool.query('SELECT * FROM imoveis WHERE empresa_id = $1 AND is_vendido = false', [empresaId]);
        const imovelIds = imoveis.rows.map(imovel => imovel.id);
        if (imovelIds.length === 0) return res.status(200).json([]);

        const fotos = await pool.query('SELECT * FROM fotos_imoveis WHERE imovel_id = ANY($1::int[])', [imovelIds]);
        
        const imoveisComFotos = imoveis.rows.map(imovel => ({
            ...imovel,
            fotos: fotos.rows.filter(foto => foto.imovel_id === imovel.id)
        }));
        res.status(200).json(imoveisComFotos);
    } catch (error) { console.error('Erro ao buscar imóveis do mobile:', error.message); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    console.log('Pasta "uploads" criada com sucesso.');
  }
});