const pool = require('../db');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const aiService = require('../services/aiService'); 

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
    const { nome_residencial, link_google_maps, ...outrosDados } = req.body;
    
    let novoImovel;

    try {
        const empresa = await pool.query('SELECT id FROM empresas WHERE id = $1 AND usuario_id = $2', [empresaId, adminId]);
        if (empresa.rows.length === 0) return res.status(403).json({ error: 'Acesso negado.' });

        const novoImovelRes = await pool.query(
            `INSERT INTO imoveis (usuario_id, empresa_id, nome_residencial, link_google_maps) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [adminId, empresaId, nome_residencial, link_google_maps]
        );
        novoImovel = novoImovelRes.rows[0];
        
        res.status(201).json(novoImovel);

    } catch (error) { 
        console.error('Erro cadastro:', error); 
        return res.status(500).json({ error: 'Erro interno.' }); 
    }

    try {
        if (!link_google_maps) return;

        let finalUrl = link_google_maps;
        
        const coords = aiService.extractCoordsFromMapLink(finalUrl);
        if (!coords) return;

        const places = await aiService.fetchNearbyPlaces(coords.latitude, coords.longitude);
        if (!places || places.length === 0) return;
        
        const iaDescription = await aiService.generateAIDescription(places);
        
        if (iaDescription) {
            await pool.query('UPDATE imoveis SET descricao_ia = $1 WHERE id = $2', [iaDescription, novoImovel.id]);
        }
    } catch (e) { console.error('Erro IA:', e.message); }
};

const addFoto = async (req, res) => {
    const { id: imovelId } = req.params;
    const { titulo } = req.body;
    
    if (!req.file) return res.status(400).json({ error: 'Sem arquivo.' });
    const link_foto = `http://localhost:5000/uploads/${req.file.filename}`;

    try {
        await pool.query('INSERT INTO fotos_imoveis (imovel_id, link_foto, titulo) VALUES ($1, $2, $3)', [imovelId, link_foto, titulo]);
        res.status(201).json({ link_foto });
    } catch (error) { res.status(500).json({ error: 'Erro' }); }
};

const getImoveisByEmpresa = async (req, res) => {
    const { empresaId } = req.params;
    const adminId = req.usuarioId;
    try {
        // Verifica acesso
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

module.exports = { 
    deleteImovel, deleteFoto,
    createImovel, addFoto,
    getImoveisByEmpresa, getImovelById, addDocumento
};