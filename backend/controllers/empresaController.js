const pool = require('../db');

const deleteEmpresa = async (req, res) => {
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
        if (res) res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
};

const desvincularUsuario = async (req, res) => {
    const { empresaId, usuarioId } = req.params;
    try {
        await pool.query(
            'DELETE FROM empresa_usuarios_mobile WHERE empresa_id = $1 AND usuario_id = $2',
            [empresaId, usuarioId]
        );
        res.status(200).json({ message: 'Usuário desvinculado com sucesso!' });
    } catch (error) { 
        console.error('Erro ao desvincular usuário:', error.message); 
        if (res) res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
};

const createEmpresa = async (req, res) => {
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
    } catch (error) { 
        console.error('Erro ao cadastrar empresa:', error.message); 
        if (res) res.status(500).json({ error: 'Erro interno.' }); 
    }
};

const vincularUsuario = async (req, res) => {
    const { empresaId } = req.params;
    const { usuario_mobile_id } = req.body;
    try {
        await pool.query(
            'INSERT INTO empresa_usuarios_mobile (empresa_id, usuario_id) VALUES ($1, $2)',
            [empresaId, usuario_mobile_id]
        );
        res.status(201).json({ message: 'Usuário vinculado com sucesso!' });
    } catch (error) { 
        console.error('Erro ao vincular:', error.message); 
        if (res) res.status(500).json({ error: 'Erro interno.' }); 
    }
};

const getEmpresas = async (req, res) => {
    const adminId = req.usuarioId;
    try {
        const empresas = await pool.query('SELECT * FROM empresas WHERE usuario_id = $1 ORDER BY nome_fantasia ASC', [adminId]);
        res.status(200).json(empresas.rows);
    } catch (error) {
        console.error('Erro ao listar empresas:', error.message);
        if (res) res.status(500).json({ error: 'Erro interno.' });
    }
};

const getEmpresaById = async (req, res) => {
    const { id } = req.params;
    const adminId = req.usuarioId;
    try {
        const empresa = await pool.query('SELECT * FROM empresas WHERE id = $1 AND usuario_id = $2', [id, adminId]);
        if (empresa.rows.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada.' });
        }
        res.status(200).json(empresa.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar empresa:', error.message);
        if (res) res.status(500).json({ error: 'Erro interno.' });
    }
};

module.exports = { 
    deleteEmpresa, desvincularUsuario,
    createEmpresa, vincularUsuario,
    getEmpresas, getEmpresaById
};