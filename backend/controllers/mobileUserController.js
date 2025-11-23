const pool = require('../db');

const deleteMobileUser = async (req, res) => {
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
        if (res) res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const getAllMobileUsers = async (req, res) => {
    const adminId = req.usuarioId;
    try {
        const users = await pool.query('SELECT id, nome, email FROM usuarios_mobile WHERE cadastrado_por_usuario_id = $1 ORDER BY nome', [adminId]);
        res.status(200).json(users.rows);
    } catch (error) {
        if (res) res.status(500).json({ error: 'Erro interno.' });
    }
};

const getMobileUserById = async (req, res) => {
    const { id } = req.params;
    const adminId = req.usuarioId;
    try {
        const user = await pool.query('SELECT * FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2', [id, adminId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
        res.status(200).json(user.rows[0]);
    } catch (error) { if (res) res.status(500).json({ error: 'Erro interno.' }); }
};

const getMobileUsersByEmpresa = async (req, res) => {
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
    } catch (error) { if (res) res.status(500).json({ error: 'Erro interno.' }); }
};

const getDesvinculados = async (req, res) => {
    const { empresaId } = req.params;
    const adminId = req.usuarioId;
    try {
        const users = await pool.query(
            `SELECT * FROM usuarios_mobile um
             WHERE um.cadastrado_por_usuario_id = $1
             AND NOT EXISTS (SELECT 1 FROM empresa_usuarios_mobile eum WHERE eum.empresa_id = $2 AND eum.usuario_id = um.id)`,
            [adminId, empresaId]
        );
        res.status(200).json(users.rows);
    } catch (error) { if (res) res.status(500).json({ error: 'Erro interno.' }); }
};

const createMobileUser = async (req, res) => {
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
    } catch (error) { 
        console.error('Erro create user:', error.message); 
        if (res) res.status(500).json({ error: 'Erro interno.' }); 
    }
};

const updateMobileUser = async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    const { nome, sobrenome, email } = req.body;
    try {
        const user = await pool.query('SELECT id FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2', [mobileUserId, adminId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
        
        await pool.query('UPDATE usuarios_mobile SET nome = $1, sobrenome = $2, email = $3 WHERE id = $4', [nome, sobrenome, email, mobileUserId]);
        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error) { 
        console.error('Erro update user:', error.message); 
        if (res) res.status(500).json({ error: 'Erro interno.' }); 
    }
};

const updateMobileUserPassword = async (req, res) => {
    const { id: mobileUserId } = req.params;
    const adminId = req.usuarioId;
    const { novaSenha } = req.body;
    if (!novaSenha) return res.status(400).json({ error: 'Senha obrigatória.' });
    
    try {
        const user = await pool.query('SELECT id FROM usuarios_mobile WHERE id = $1 AND cadastrado_por_usuario_id = $2', [mobileUserId, adminId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
        
        const senhaHash = await bcrypt.hash(novaSenha, 10);
        await pool.query('UPDATE usuarios_mobile SET senha_hash = $1 WHERE id = $2', [senhaHash, mobileUserId]);
        res.status(200).json({ message: 'Senha atualizada!' });
    } catch (error) { 
        console.error('Erro update password:', error.message); 
        if (res) res.status(500).json({ error: 'Erro interno.' }); 
    }
};

module.exports = { deleteMobileUser, getAllMobileUsers, getMobileUserById, getMobileUsersByEmpresa, getDesvinculados, createMobileUser, updateMobileUser, updateMobileUserPassword };