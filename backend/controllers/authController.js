const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SEGREDO_JWT = 'seu-segredo-super-secreto-para-jwt';

const register = async (req, res) => {
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
    } catch (error) {
        console.error('Erro no cadastro:', error.message);
        if (res) res.status(500).json({ error: 'Erro interno.' });
    }
};

const login = async (req, res) => {
    const { email, senha } = req.body;
    try {
        const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (resultado.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const usuario = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaCorreta) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const token = jwt.sign({ id: usuario.id, email: usuario.email, nome: usuario.nome }, SEGREDO_JWT, { expiresIn: '8h' });
        res.status(200).json({ message: 'Login bem-sucedido!', token });
    } catch (error) {
        console.error('Erro no login:', error.message);
        if (res) res.status(500).json({ error: 'Erro interno.' });
    }
};

const loginMobile = async (req, res) => {
    const { email, senha } = req.body;
    try {
        const resultado = await pool.query('SELECT * FROM usuarios_mobile WHERE email = $1', [email]);
        if (resultado.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const usuario = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaCorreta) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const token = jwt.sign({ id: usuario.id, email: usuario.email, tipo: 'mobile' }, process.env.SEGREDO_JWT || 'seu-segredo-super-secreto-para-jwt', { expiresIn: '30d' });
        res.status(200).json({ message: `Login bem-sucedido!`, token });
    } catch (error) { 
        console.error('Erro login mobile:', error.message); 
        if (res) res.status(500).json({ error: 'Erro interno.' }); 
    }
};

module.exports = { register, login, loginMobile };