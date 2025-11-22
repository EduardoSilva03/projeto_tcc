/*const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = 5000;
const SEGREDO_JWT = 'seu-segredo-super-secreto-para-jwt';

const GOOGLE_API_KEY = 'AIzaSyCHA1pqa1GwueIaYfOjykaBZC7gJ1BkSY0';

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

function extractCoordsFromMapLink(url) {
    if (!url) return null;
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match && match[1] && match[2]) {
        return { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) };
    }
    return null;
}

async function fetchNearbyPlaces(latitude, longitude) {
    const radius = 1000;
    const types = 'school|supermarket|pharmacy|park|restaurant';
    const url = `https://places.googleapis.com/v1/places:searchNearby`;

    const body = {
        includedTypes: types.split('|'),
        maxResultCount: 10,
        locationRestriction: {
            circle: {
                center: { latitude, longitude },
                radius: radius
            }
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.types,places.location'
    };

    try {
        const response = await axios.post(url, body, { headers });
        return response.data.places.map(place => ({
            nome: place.displayName.text,
            tipo: place.types[0],
        }));
    } catch (error) {
        console.error('Erro ao buscar no Google Places:', error.response?.data?.error || error.message);
        return null;
    }
}

async function generateAIDescription(placesData) {
    const placesString = placesData.map(p => `- ${p.nome} (tipo: ${p.tipo})`).join('\n');

    const prompt = `
        Você é um corretor de imóveis. 
        Escreva um parágrafo curto e atraente em português do Brasil, 
        resumindo os pontos positivos da localização deste imóvel.
        Seja amigável e focado em conveniência.
        
        Aqui estão os pontos de interesse próximos:
        ${placesString}
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;

    const body = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = await axios.post(url, body);
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Erro ao chamar Gemini:', error.response?.data?.error || error.message);
        return null;
    }
}

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

    let novoImovel;

    try {
        const empresa = await pool.query('SELECT id FROM empresas WHERE id = $1 AND usuario_id = $2', [empresaId, adminId]);
        if (empresa.rows.length === 0) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });

        const novoImovelRes = await pool.query(
            `INSERT INTO imoveis (usuario_id, empresa_id, nome_residencial, tipo_imovel, unidade, valor, cep, rua, numero, bairro, cidade, estado, complemento, link_google_maps, situacao, data_entrega_prevista, is_financiamento_liberado, financiamento_aceito)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
            [adminId, empresaId, nome_residencial, tipo_imovel, unidade, valor, cep, rua, numero, bairro, cidade, estado, complemento, link_google_maps, situacao, data_entrega_prevista, is_financiamento_liberado, financiamento_aceito]
        );
        novoImovel = novoImovelRes.rows[0];

        res.status(201).json(novoImovel);

    } catch (error) {
        console.error('Erro ao cadastrar imóvel:', error.message);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }

    try {
        if (!link_google_maps) return;

        let finalUrl = link_google_maps;
        if (link_google_maps.includes('goo.gl') || link_google_maps.includes('maps.app.goo.gl')) {
            console.log('Link encurtado detectado. Resolvendo...');
            try {
                const response = await axios.get(link_google_maps);
                finalUrl = response.request.res.responseUrl;
                if (!finalUrl) {
                    console.log('Não foi possível resolver a URL encurtada.');
                    return;
                }
                console.log(`URL final resolvida: ${finalUrl}`);
            } catch (redirectError) {
                console.error('Erro ao resolver link encurtado:', redirectError.message);
                return;
            }
        }

        const coords = extractCoordsFromMapLink(finalUrl);
        if (!coords) {
            console.log(`Não foi possível extrair coordenadas do link: ${finalUrl}`);
            return;
        }

        const places = await fetchNearbyPlaces(coords.latitude, coords.longitude);
        if (!places || places.length === 0) {
            console.log('Nenhum ponto de interesse encontrado.');
            return;
        }

        const iaDescription = await generateAIDescription(places);
        if (iaDescription) {
            await pool.query(
                'UPDATE imoveis SET descricao_ia = $1 WHERE id = $2',
                [iaDescription, novoImovel.id]
            );
            console.log(`Descrição de IA gerada e salva para o imóvel ${novoImovel.id}`);
        }
    } catch (iaError) {
        console.error('Erro no processamento de IA (em segundo plano):', iaError.message);
    }
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

app.delete('/imoveis/:id', verificarToken, async (req, res) => {
    const { id: imovelId } = req.params;
    const adminId = req.usuarioId;
    try {
        const imovel = await pool.query('SELECT id FROM imoveis WHERE id = $1 AND usuario_id = $2', [imovelId, adminId]);
        if (imovel.rows.length === 0) {
            return res.status(404).json({ error: 'Imóvel não encontrado ou você não tem permissão para excluí-lo.' });
        }

        const fotosRes = await pool.query('SELECT link_foto FROM fotos_imoveis WHERE imovel_id = $1', [imovelId]);
        for (const foto of fotosRes.rows) {
            const filename = path.basename(foto.link_foto); // Extrai 'foto-123.jpg' da URL
            fs.unlink(path.join(__dirname, 'uploads', filename), (err) => {
                if (err) console.error(`Erro ao deletar arquivo: ${filename}`, err.message);
            });
        }

        await pool.query('DELETE FROM imoveis WHERE id = $1', [imovelId]);

        res.status(200).json({ message: 'Imóvel e arquivos associados excluídos com sucesso!' });

    } catch (error) {
        console.error('Erro ao excluir imóvel:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
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

app.delete('/imoveis/fotos/:id', verificarToken, async (req, res) => {
    const { id: fotoId } = req.params;
    const adminId = req.usuarioId;
    try {
        const fotoRes = await pool.query(
            `SELECT f.link_foto FROM fotos_imoveis f
             JOIN imoveis i ON f.imovel_id = i.id
             WHERE f.id = $1 AND i.usuario_id = $2`,
            [fotoId, adminId]
        );

        if (fotoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Foto não encontrada ou não pertence a você.' });
        }

        const { link_foto } = fotoRes.rows[0];
        const filename = path.basename(link_foto);
        fs.unlink(path.join(__dirname, 'uploads', filename), (err) => {
            if (err) console.error(`Erro ao deletar arquivo: ${filename}`, err.message);
        });

        await pool.query('DELETE FROM fotos_imoveis WHERE id = $1', [fotoId]);

        res.status(200).json({ message: 'Foto excluída com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir foto:', error.message);
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

app.get('/mobile-users', verificarToken, async (req, res) => {
    const adminId = req.usuarioId;
    try {
        const users = await pool.query(
            'SELECT id, nome, sobrenome, email FROM usuarios_mobile WHERE cadastrado_por_usuario_id = $1 ORDER BY nome',
            [adminId]
        );
        res.status(200).json(users.rows);
    } catch (error) {
        console.error('Erro ao listar usuários mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// *** ADICIONADO: ROTA PARA BUSCAR UM USUÁRIO (para a pág de edição) ***
app.get('/mobile-users/:id', verificarToken, async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    try {
        const user = await pool.query(
            'SELECT id, nome, sobrenome, email FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [mobileUserId, adminId]
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

// *** ADICIONADO: ROTA PARA ATUALIZAR UM USUÁRIO (para a pág de edição) ***
app.put('/mobile-users/:id', verificarToken, async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    const { nome, sobrenome, email } = req.body;
    try {
        const user = await pool.query(
            'SELECT id FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [mobileUserId, adminId]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }

        await pool.query(
            'UPDATE usuarios_mobile SET nome = $1, sobrenome = $2, email = $3 WHERE id = $4',
            [nome, sobrenome, email, mobileUserId]
        );
        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar usuário mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// *** ADICIONADO: ROTA PARA ATUALIZAR SENHA (para a pág de edição) ***
app.patch('/mobile-users/:id/password', verificarToken, async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    const { novaSenha } = req.body;

    if (!novaSenha) {
        return res.status(400).json({ error: 'A nova senha é obrigatória.' });
    }

    try {
        const user = await pool.query(
            'SELECT id FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [mobileUserId, adminId]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }

        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(novaSenha, saltRounds);

        await pool.query(
            'UPDATE usuarios_mobile SET senha_hash = $1 WHERE id = $2',
            [senhaHash, mobileUserId]
        );
        res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar senha:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/mobile-users/:id', verificarToken, async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    try {
        const user = await pool.query(
            'SELECT id FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [mobileUserId, adminId]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }

        await pool.query('DELETE FROM usuarios_mobile WHERE id = $1', [mobileUserId]);

        res.status(200).json({ message: 'Usuário mobile excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir usuário mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
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

app.patch('/mobile/imoveis/:id/reservar-visita', verificarToken, async (req, res) => {
    const imovelId = req.params.id;
    const mobileUserId = req.usuarioId;

    try {
        const imovel = await pool.query('SELECT visitante_atual_id FROM imoveis WHERE id = $1', [imovelId]);
        if (imovel.rows.length === 0) {
            return res.status(404).json({ error: 'Imóvel não encontrado.' });
        }
        if (imovel.rows[0].visitante_atual_id !== null) {
            return res.status(409).json({ error: 'Este imóvel já está em visita por outro usuário.' });
        }

        await pool.query(
            'UPDATE imoveis SET visitante_atual_id = $1 WHERE id = $2',
            [mobileUserId, imovelId]
        );

        const visitante = await pool.query('SELECT nome, sobrenome FROM usuarios_mobile WHERE id = $1', [mobileUserId]);
        res.status(200).json({
            message: 'Visita reservada com sucesso!',
            visitante: {
                id: mobileUserId,
                nome_completo: `${visitante.rows[0].nome} ${visitante.rows[0].sobrenome}`
            }
        });

    } catch (error) {
        console.error('Erro ao reservar visita:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.patch('/mobile/imoveis/:id/finalizar-visita', verificarToken, async (req, res) => {
    const imovelId = req.params.id;
    const mobileUserId = req.usuarioId;

    try {
        const imovel = await pool.query('SELECT visitante_atual_id FROM imoveis WHERE id = $1', [imovelId]);
        if (imovel.rows.length === 0) {
            return res.status(404).json({ error: 'Imóvel não encontrado.' });
        }
        if (imovel.rows[0].visitante_atual_id !== mobileUserId) {
            return res.status(403).json({ error: 'Você não pode finalizar uma visita que não é sua.' });
        }

        await pool.query(
            'UPDATE imoveis SET visitante_atual_id = NULL WHERE id = $1',
            [imovelId]
        );

        res.status(200).json({ message: 'Visita finalizada com sucesso!' });

    } catch (error) {
        console.error('Erro ao finalizar visita:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/mobile/me', verificarToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT id, nome, sobrenome FROM usuarios_mobile WHERE id = $1', [req.usuarioId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.status(200).json(user.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
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

        const imoveisRes = await pool.query(
            `SELECT im.*, 
                um.nome AS visitante_nome, 
                um.sobrenome AS visitante_sobrenome
         FROM imoveis im
         LEFT JOIN usuarios_mobile um ON im.visitante_atual_id = um.id
         WHERE im.empresa_id = $1 AND im.is_vendido = false`,
            [empresaId]
        );

        const imoveis = imoveisRes.rows;
        const imovelIds = imoveis.map(imovel => imovel.id);
        if (imovelIds.length === 0) return res.status(200).json([]);

        const fotos = await pool.query('SELECT * FROM fotos_imoveis WHERE imovel_id = ANY($1::int[])', [imovelIds]);

        const imoveisComFotos = imoveis.map(imovel => ({
            ...imovel,
            visitante_nome_completo: (imovel.visitante_nome) ? `${imovel.visitante_nome} ${imovel.visitante_sobrenome}` : null,
            fotos: fotos.rows.filter(foto => foto.imovel_id === imovel.id)
        }));
        res.status(200).json(imoveisComFotos);

    } catch (error) {
        console.error('Erro ao buscar imóveis do mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
        console.log('Pasta "uploads" criada com sucesso.');
    }
});*/

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = 5000;
const SEGREDO_JWT = 'seu-segredo-super-secreto-para-jwt';

// Chave da API do Google Cloud
const GOOGLE_API_KEY = 'AIzaSyBR4QUBWZFDueO9KAN8Ir7r1fRNz-Z7HpU';

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

// --- FUNÇÕES DE HELPER DA IA ---
function extractCoordsFromMapLink(url) {
    if (!url) return null;
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match && match[1] && match[2]) {
        return { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) };
    }
    return null;
}

async function fetchNearbyPlaces(latitude, longitude) {
    const radius = 1000;
    const types = ['school', 'supermarket', 'pharmacy', 'park', 'restaurant'];
    const url = `https://places.googleapis.com/v1/places:searchNearby`;

    const body = {
        includedTypes: types,
        maxResultCount: 10,
        locationRestriction: {
            circle: {
                center: { latitude, longitude },
                radius: radius
            }
        },
        languageCode: "pt-BR"
    };

    const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.types,places.location'
    };

    try {
        const response = await axios.post(url, body, { headers });
        if (!response.data.places) return [];
        return response.data.places.map(place => ({
            nome: place.displayName.text,
            tipo: place.types[0],
        }));
    } catch (error) {
        console.error('Erro ao buscar no Google Places:', error.response?.data?.error || error.message);
        return null;
    }
}

async function generateAIDescription(placesData) {
    const placesString = placesData.map(p => `- ${p.nome} (tipo: ${p.tipo})`).join('\n');
    
    // Tenta ler o arquivo de vocabulário (opcional)
    let vocabularioCorretor = "";
    try {
        const vocabPath = path.join(__dirname, 'vocabulario_corretor.txt');
        if (fs.existsSync(vocabPath)) {
            vocabularioCorretor = fs.readFileSync(vocabPath, 'utf8');
        }
    } catch (err) { console.error("Erro ao ler vocabulário:", err); }

    const prompt = `
        Você é um corretor de imóveis experiente e persuasivo.
        Sua tarefa é escrever uma descrição curta e atraente (máximo 3 frases) sobre a localização deste imóvel.

        UTILIZE O SEGUINTE GUIA DE ESTILO E VOCABULÁRIO (SE HOUVER):
        ${vocabularioCorretor}
        
        DADOS REAIS DA LOCALIZAÇÃO (Pontos de interesse próximos):
        ${placesString}

        Instruções finais:
        - Integre os pontos de interesse no texto de forma natural.
        - Não liste apenas os lugares, venda a conveniência de morar ali.
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
    
    const body = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = await axios.post(url, body);
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Erro ao chamar Gemini:', error.response?.data?.error || error.message);
        return null;
    }
}

// --- ROTAS DA API ---

// --- ROTAS DE EMPRESAS ---
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
    
    let novoImovel;

    try {
        const empresa = await pool.query('SELECT id FROM empresas WHERE id = $1 AND usuario_id = $2', [empresaId, adminId]);
        if (empresa.rows.length === 0) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });

        const novoImovelRes = await pool.query(
            `INSERT INTO imoveis (usuario_id, empresa_id, nome_residencial, tipo_imovel, unidade, valor, cep, rua, numero, bairro, cidade, estado, complemento, link_google_maps, situacao, data_entrega_prevista, is_financiamento_liberado, financiamento_aceito)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
            [adminId, empresaId, nome_residencial, tipo_imovel, unidade, valor, cep, rua, numero, bairro, cidade, estado, complemento, link_google_maps, situacao, data_entrega_prevista, is_financiamento_liberado, financiamento_aceito]
        );
        novoImovel = novoImovelRes.rows[0];
        
        res.status(201).json(novoImovel);

    } catch (error) { 
        console.error('Erro ao cadastrar imóvel:', error.message); 
        return res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }

    // Lógica da IA em segundo plano
    try {
        if (!link_google_maps) return;

        let finalUrl = link_google_maps;
        if (link_google_maps.includes('goo.gl') || link_google_maps.includes('maps.app.goo.gl')) {
            console.log('Link encurtado detectado. Resolvendo...');
            try {
                const response = await axios.get(link_google_maps);
                finalUrl = response.request.res.responseUrl;
                if (!finalUrl) {
                    console.log('Não foi possível resolver a URL encurtada.');
                    return;
                }
                console.log(`URL final resolvida: ${finalUrl}`);
            } catch (redirectError) {
                console.error('Erro ao resolver link encurtado:', redirectError.message);
                return;
            }
        }
        
        const coords = extractCoordsFromMapLink(finalUrl);
        if (!coords) {
            console.log(`Não foi possível extrair coordenadas do link: ${finalUrl}`);
            return;
        }

        const places = await fetchNearbyPlaces(coords.latitude, coords.longitude);
        if (!places || places.length === 0) {
            console.log('Nenhum ponto de interesse encontrado.');
            return;
        }
        
        const iaDescription = await generateAIDescription(places);
        if (iaDescription) {
            await pool.query(
                'UPDATE imoveis SET descricao_ia = $1 WHERE id = $2',
                [iaDescription, novoImovel.id]
            );
            console.log(`Descrição de IA gerada e salva para o imóvel ${novoImovel.id}`);
        }
    } catch (iaError) {
        console.error('Erro no processamento de IA (em segundo plano):', iaError.message);
    }
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

// *** ROTA PARA LISTAR USUÁRIOS (A que estava faltando) ***
app.get('/mobile-users', verificarToken, async (req, res) => {
    const adminId = req.usuarioId;
    try {
        const users = await pool.query(
            'SELECT id, nome, sobrenome, email FROM usuarios_mobile WHERE cadastrado_por_usuario_id = $1 ORDER BY nome',
            [adminId]
        );
        res.status(200).json(users.rows);
    } catch (error) { 
        console.error('Erro ao listar usuários mobile:', error.message); 
        res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
});

// *** ROTA PARA BUSCAR UM USUÁRIO (Para EditUser.js) ***
app.get('/mobile-users/:id', verificarToken, async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    try {
        const user = await pool.query(
            'SELECT id, nome, sobrenome, email FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [mobileUserId, adminId]
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

// *** ROTA PARA ATUALIZAR UM USUÁRIO (Para EditUser.js) ***
app.put('/mobile-users/:id', verificarToken, async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    const { nome, sobrenome, email } = req.body;
    try {
        const user = await pool.query(
            'SELECT id FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [mobileUserId, adminId]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }
        
        await pool.query(
            'UPDATE usuarios_mobile SET nome = $1, sobrenome = $2, email = $3 WHERE id = $4',
            [nome, sobrenome, email, mobileUserId]
        );
        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error) { 
        console.error('Erro ao atualizar usuário mobile:', error.message); 
        res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
});

// *** ROTA PARA ATUALIZAR SENHA (Para EditUser.js) ***
app.patch('/mobile-users/:id/password', verificarToken, async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    const { novaSenha } = req.body;

    if (!novaSenha) {
        return res.status(400).json({ error: 'A nova senha é obrigatória.' });
    }
    
    try {
        const user = await pool.query(
            'SELECT id FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [mobileUserId, adminId]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }
        
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(novaSenha, saltRounds);

        await pool.query(
            'UPDATE usuarios_mobile SET senha_hash = $1 WHERE id = $2',
            [senhaHash, mobileUserId]
        );
        res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch (error) { 
        console.error('Erro ao atualizar senha:', error.message); 
        res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
});

// *** ROTA PARA DELETAR USUÁRIO MOBILE ***
app.delete('/mobile-users/:id', verificarToken, async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    try {
        const user = await pool.query(
            'SELECT id FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2',
            [mobileUserId, adminId]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário mobile não encontrado ou não pertence a você.' });
        }
        
        await pool.query('DELETE FROM usuarios_mobile WHERE id = $1', [mobileUserId]);
        
        res.status(200).json({ message: 'Usuário mobile excluído com sucesso!' });
    } catch (error) { 
        console.error('Erro ao excluir usuário mobile:', error.message); 
        res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
});

// *** ROTA PARA DELETAR EMPRESA ***
app.delete('/empresas/:id', verificarToken, async (req, res) => {
    const { id: empresaId } = req.params;
    const adminId = req.usuarioId;
    try {
        const empresa = await pool.query('SELECT id FROM empresas WHERE id = $1 AND usuario_id = $2', [empresaId, adminId]);
        if (empresa.rows.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada ou não pertence a você.' });
        }
        await pool.query('DELETE FROM empresas WHERE id = $1', [empresaId]);
        res.status(200).json({ message: 'Empresa excluída com sucesso!' });
    } catch (error) { 
        console.error('Erro ao excluir empresa:', error.message); 
        res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
});

// *** ROTA PARA DELETAR IMÓVEL ***
app.delete('/imoveis/:id', verificarToken, async (req, res) => {
    const { id: imovelId } = req.params;
    const adminId = req.usuarioId;
    try {
        const imovel = await pool.query('SELECT id FROM imoveis WHERE id = $1 AND usuario_id = $2', [imovelId, adminId]);
        if (imovel.rows.length === 0) {
            return res.status(404).json({ error: 'Imóvel não encontrado ou você não tem permissão para excluí-lo.' });
        }
        const fotosRes = await pool.query('SELECT link_foto FROM fotos_imoveis WHERE imovel_id = $1', [imovelId]);
        for (const foto of fotosRes.rows) {
            try {
                const filename = path.basename(foto.link_foto);
                fs.unlink(path.join(__dirname, 'uploads', filename), (err) => {});
            } catch (e) {}
        }
        await pool.query('DELETE FROM imoveis WHERE id = $1', [imovelId]);
        res.status(200).json({ message: 'Imóvel e arquivos associados excluídos com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir imóvel:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// *** ROTA PARA DELETAR FOTO ***
app.delete('/imoveis/fotos/:id', verificarToken, async (req, res) => {
    const { id: fotoId } = req.params;
    const adminId = req.usuarioId;
    try {
        const fotoRes = await pool.query(
            `SELECT f.link_foto FROM fotos_imoveis f
             JOIN imoveis i ON f.imovel_id = i.id
             WHERE f.id = $1 AND i.usuario_id = $2`,
            [fotoId, adminId]
        );
        if (fotoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Foto não encontrada ou não pertence a você.' });
        }
        const { link_foto } = fotoRes.rows[0];
        const filename = path.basename(link_foto);
        fs.unlink(path.join(__dirname, 'uploads', filename), (err) => {});
        await pool.query('DELETE FROM fotos_imoveis WHERE id = $1', [fotoId]);
        res.status(200).json({ message: 'Foto excluída com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir foto:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
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

// --- ROTAS DO APP MOBILE ---
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

app.patch('/mobile/imoveis/:id/reservar-visita', verificarToken, async (req, res) => {
    const imovelId = req.params.id;
    const mobileUserId = req.usuarioId;

    try {
        const imovel = await pool.query('SELECT visitante_atual_id FROM imoveis WHERE id = $1', [imovelId]);
        if (imovel.rows.length === 0) {
            return res.status(404).json({ error: 'Imóvel não encontrado.' });
        }
        if (imovel.rows[0].visitante_atual_id !== null) {
            return res.status(409).json({ error: 'Este imóvel já está em visita por outro usuário.' });
        }

        await pool.query(
            'UPDATE imoveis SET visitante_atual_id = $1 WHERE id = $2',
            [mobileUserId, imovelId]
        );

        const visitante = await pool.query('SELECT nome, sobrenome FROM usuarios_mobile WHERE id = $1', [mobileUserId]);
        res.status(200).json({
            message: 'Visita reservada com sucesso!',
            visitante: {
                id: mobileUserId,
                nome_completo: `${visitante.rows[0].nome} ${visitante.rows[0].sobrenome}`
            }
        });

    } catch (error) {
        console.error('Erro ao reservar visita:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.patch('/mobile/imoveis/:id/finalizar-visita', verificarToken, async (req, res) => {
    const imovelId = req.params.id;
    const mobileUserId = req.usuarioId;

    try {
        const imovel = await pool.query('SELECT visitante_atual_id FROM imoveis WHERE id = $1', [imovelId]);
        if (imovel.rows.length === 0) {
            return res.status(404).json({ error: 'Imóvel não encontrado.' });
        }
        if (imovel.rows[0].visitante_atual_id !== mobileUserId) {
            return res.status(403).json({ error: 'Você não pode finalizar uma visita que não é sua.' });
        }

        await pool.query(
            'UPDATE imoveis SET visitante_atual_id = NULL WHERE id = $1',
            [imovelId]
        );

        res.status(200).json({ message: 'Visita finalizada com sucesso!' });

    } catch (error) {
        console.error('Erro ao finalizar visita:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/mobile/me', verificarToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT id, nome, sobrenome FROM usuarios_mobile WHERE id = $1', [req.usuarioId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.status(200).json(user.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
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

        const imoveisRes = await pool.query(
            `SELECT im.*, 
                um.nome AS visitante_nome, 
                um.sobrenome AS visitante_sobrenome
           FROM imoveis im
           LEFT JOIN usuarios_mobile um ON im.visitante_atual_id = um.id
           WHERE im.empresa_id = $1 AND im.is_vendido = false`,
            [empresaId]
        );

        const imoveis = imoveisRes.rows;
        const imovelIds = imoveis.map(imovel => imovel.id);
        if (imovelIds.length === 0) return res.status(200).json([]);

        const fotos = await pool.query('SELECT * FROM fotos_imoveis WHERE imovel_id = ANY($1::int[])', [imovelIds]);
        // NOVO: Busca documentos também para o mobile
        const documentos = await pool.query('SELECT * FROM documentos WHERE imovel_id = ANY($1::int[])', [imovelIds]);

        const imoveisComFotos = imoveis.map(imovel => ({
            ...imovel,
            visitante_nome_completo: (imovel.visitante_nome) ? `${imovel.visitante_nome} ${imovel.visitante_sobrenome}` : null,
            fotos: fotos.rows.filter(foto => foto.imovel_id === imovel.id),
            documentos: documentos.rows.filter(doc => doc.imovel_id === imovel.id)
        }));
        res.status(200).json(imoveisComFotos);

    } catch (error) {
        console.error('Erro ao buscar imóveis do mobile:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
        console.log('Pasta "uploads" criada com sucesso.');
    }
});