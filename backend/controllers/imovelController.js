const pool = require('../db');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const aiService = require('../services/aiService'); 

const MEU_IP = '192.168.100.48';
const PORT = 5000;
const BASE_URL = `http://${MEU_IP}:${PORT}`;

const deleteImovel = async (req, res) => {
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
                const filePath = path.resolve(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) { console.error('Erro ao deletar arquivo físico:', e.message); }
        }

        await pool.query('DELETE FROM imoveis WHERE id = $1', [imovelId]);
        
        res.status(200).json({ message: 'Imóvel e arquivos associados excluídos com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir imóvel:', error.message);
        if (res) res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const deleteFoto = async (req, res) => {
    const { id: fotoId } = req.params;
    const adminId = req.usuarioId;
    try {
        const fotoRes = await pool.query(
            `SELECT f.link_foto FROM fotos_imoveis f JOIN imoveis i ON f.imovel_id = i.id WHERE f.id = $1 AND i.usuario_id = $2`,
            [fotoId, adminId]
        );
        
        if (fotoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Foto não encontrada ou não pertence a você.' });
        }

        const { link_foto } = fotoRes.rows[0];
        try {
            const filename = path.basename(link_foto);
            const filePath = path.resolve(__dirname, '..', 'uploads', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (e) { console.error('Erro ao deletar arquivo físico:', e.message); }

        await pool.query('DELETE FROM fotos_imoveis WHERE id = $1', [fotoId]);
        res.status(200).json({ message: 'Foto excluída com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir foto:', error.message);
        if (res) res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const createImovel = async (req, res) => {
    const { empresaId } = req.params;
    const adminId = req.usuarioId;
    
    const { 
        nome_residencial, tipo_imovel, unidade, valor, cep, rua, numero, bairro, cidade, estado, complemento, 
        link_google_maps, situacao, data_entrega_prevista, is_financiamento_liberado, financiamento_aceito 
    } = req.body;
    
    let novoImovel;

    try {
        const empresa = await pool.query('SELECT id FROM empresas WHERE id = $1 AND usuario_id = $2', [empresaId, adminId]);
        if (empresa.rows.length === 0) return res.status(403).json({ error: 'Acesso negado.' });

        const novoImovelRes = await pool.query(
            `INSERT INTO imoveis (
                usuario_id, empresa_id, nome_residencial, tipo_imovel, unidade, valor, 
                cep, rua, numero, bairro, cidade, estado, complemento, 
                link_google_maps, situacao, data_entrega_prevista, 
                is_financiamento_liberado, financiamento_aceito
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
            RETURNING *`,
            [
                adminId, empresaId, nome_residencial, tipo_imovel, unidade, valor,
                cep, rua, numero, bairro, cidade, estado, complemento,
                link_google_maps, situacao, data_entrega_prevista,
                is_financiamento_liberado, financiamento_aceito
            ]
        );
        novoImovel = novoImovelRes.rows[0];
        
        res.status(201).json(novoImovel);

    } catch (error) { 
        console.error('Erro cadastro:', error); 
        return res.status(500).json({ error: 'Erro interno: ' + error.message }); 
    }

    (async () => {
        try {
            if (!link_google_maps) return;

            let finalUrl = link_google_maps;

            if (link_google_maps.includes('goo.gl') || link_google_maps.includes('maps.app.goo.gl')) {
                console.log('Resolvendo link curto:', link_google_maps);
                try {
                    const response = await axios.get(link_google_maps);
                    if (response.request.res.responseUrl) {
                        finalUrl = response.request.res.responseUrl;
                        console.log('URL resolvida:', finalUrl);
                    }
                } catch (e) { 
                    console.error('Erro ao resolver link curto:', e.message);
                    return; 
                }
            }
            
            const coords = aiService.extractCoordsFromMapLink(finalUrl);
            if (!coords) {
                console.log('Não foi possível extrair coordenadas do link.');
                return;
            }

            const places = await aiService.fetchNearbyPlaces(coords.latitude, coords.longitude);
            if (!places || places.length === 0) {
                console.log('Nenhum local próximo encontrado pela API.');
                return;
            }
            
            const iaDescription = await aiService.generateAIDescription(places);
            
            if (iaDescription) {
                await pool.query('UPDATE imoveis SET descricao_ia = $1 WHERE id = $2', [iaDescription, novoImovel.id]);
                console.log(`[SUCESSO] Descrição de IA salva para o imóvel ${novoImovel.id}`);
            }
        } catch (e) { 
            console.error('Erro processo IA:', e.message); 
            if (e.response) console.error('Detalhes do erro API:', e.response.data);
        }
    })();
};

const addFoto = async (req, res) => {
    const { id: imovelId } = req.params;
    const { titulo } = req.body;
    const adminId = req.usuarioId;
    
    if (!req.file) return res.status(400).json({ error: 'Sem arquivo.' });
    
    const link_foto = `${BASE_URL}/uploads/${req.file.filename}`;

    try {
         const imovel = await pool.query('SELECT empresa_id FROM imoveis WHERE id = $1 AND usuario_id = $2', [imovelId, adminId]);
         if (imovel.rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado.' });
         const { empresa_id } = imovel.rows[0];

        const novaFotoRes = await pool.query(
            'INSERT INTO fotos_imoveis (imovel_id, empresa_id, usuario_id, link_foto, titulo) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
            [imovelId, empresa_id, adminId, link_foto, titulo]
        );
        
        res.status(201).json(novaFotoRes.rows[0]);
        
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar foto' }); 
    }
};

const addDocumento = async (req, res) => {
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
    } catch (error) { 
        console.error('Erro doc:', error.message); 
        if (res) res.status(500).json({ error: 'Erro interno.' }); 
    }
};

const getImoveisByEmpresa = async (req, res) => {
    const { empresaId } = req.params;
    const adminId = req.usuarioId;
    try {
        const empresa = await pool.query('SELECT id FROM empresas WHERE id = $1 AND usuario_id = $2', [empresaId, adminId]);
        if (empresa.rows.length === 0) return res.status(403).json({ error: 'Acesso negado.' });

        const imoveis = await pool.query('SELECT * FROM imoveis WHERE empresa_id = $1 ORDER BY nome_residencial', [empresaId]);
        res.status(200).json(imoveis.rows);
    } catch (error) {
        console.error('Erro ao listar imóveis:', error.message);
        if (res) res.status(500).json({ error: 'Erro interno.' });
    }
};

const getImovelById = async (req, res) => {
    const { id } = req.params;
    const adminId = req.usuarioId;
    try {
        const imovelRes = await pool.query('SELECT * FROM imoveis WHERE id = $1 AND usuario_id = $2', [id, adminId]);
        if (imovelRes.rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado.' });

        const fotosRes = await pool.query('SELECT * FROM fotos_imoveis WHERE imovel_id = $1', [id]);
        const documentosRes = await pool.query('SELECT * FROM documentos WHERE imovel_id = $1', [id]);

        const imovel = imovelRes.rows[0];
        imovel.fotos = fotosRes.rows;
        imovel.documentos = documentosRes.rows;

        res.status(200).json(imovel);
    } catch (error) {
        console.error('Erro ao buscar imóvel:', error.message);
        if (res) res.status(500).json({ error: 'Erro interno.' });
    }
};

module.exports = { 
    deleteImovel, deleteFoto,
    createImovel, addFoto,
    getImoveisByEmpresa, getImovelById, addDocumento
};