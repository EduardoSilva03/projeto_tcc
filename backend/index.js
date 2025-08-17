// index.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// --- CONFIGURAÇÃO DO SERVIDOR ---
const app = express();
const PORT = 5000;

// --- MIDDLEWARE ---
app.use(cors()); // Habilita o CORS para todas as rotas
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// --- CONFIGURAÇÃO DA CONEXÃO COM O POSTGRESQL ---
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'empreendimentos',
  password: 'root',
  port: 5432,
});

// --- ROTAS DA API ---

/**
 * ROTA DE CADASTRO DE USUÁRIO
 */
app.post('/cadastro', async (req, res) => {
  const { nome, sobrenome, email, senha } = req.body;

  try {
    // 1. Verificar se o e-mail já existe
    const usuarioExistente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    // 2. Criptografar a senha
    const saltRounds = 10; // Fator de custo para a complexidade da criptografia
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    // 3. Inserir o novo usuário no banco de dados
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

/**
 * ROTA DE LOGIN DE USUÁRIO
 */
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    // 1. Verificar se o usuário existe
    const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    const usuario = resultado.rows[0];

    // 2. Comparar a senha fornecida com a senha_hash armazenada
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    // Login bem-sucedido (em uma aplicação real, aqui você geraria um token JWT)
    res.status(200).json({ message: `Login bem-sucedido! Bem-vindo, ${usuario.nome}.` });

  } catch (error) {
    console.error('Erro no login:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});


// --- INICIAR O SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
});