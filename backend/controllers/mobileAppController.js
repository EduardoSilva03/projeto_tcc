const pool = require('../db');

const reservarVisita = async (req, res) => {
    const imovelId = req.params.id;
    const mobileUserId = req.usuarioId;
    try {
        const imovel = await pool.query('SELECT visitante_atual_id FROM imoveis WHERE id = $1', [imovelId]);
        if (imovel.rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado.' });
        if (imovel.rows[0].visitante_atual_id !== null) return res.status(409).json({ error: 'Ocupado.' });

        await pool.query('UPDATE imoveis SET visitante_atual_id = $1 WHERE id = $2', [mobileUserId, imovelId]);
        const visitante = await pool.query('SELECT nome, sobrenome FROM usuarios_mobile WHERE id = $1', [mobileUserId]);
        
        res.status(200).json({ 
            message: 'Reservado!', 
            visitante: { id: mobileUserId, nome_completo: `${visitante.rows[0].nome} ${visitante.rows[0].sobrenome}` } 
        });
    } catch (error) { if (res) res.status(500).json({ error: 'Erro.' }); }
};

const finalizarVisita = async (req, res) => {
    const imovelId = req.params.id;
    const mobileUserId = req.usuarioId;
    try {
        const imovel = await pool.query('SELECT visitante_atual_id FROM imoveis WHERE id = $1', [imovelId]);
        if (imovel.rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado.' });
        if (imovel.rows[0].visitante_atual_id !== mobileUserId) return res.status(403).json({ error: 'Não permitido.' });

        await pool.query('UPDATE imoveis SET visitante_atual_id = NULL WHERE id = $1', [imovelId]);
        res.status(200).json({ message: 'Finalizado!' });
    } catch (error) { if (res) res.status(500).json({ error: 'Erro.' }); }
};

const getMe = async (req, res) => {
    try {
        const user = await pool.query('SELECT id, nome, sobrenome FROM usuarios_mobile WHERE id = $1', [req.usuarioId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'Não encontrado.' });
        res.status(200).json(user.rows[0]);
    } catch (error) { if (res) res.status(500).json({ error: 'Erro.' }); }
};

const getMinhasEmpresas = async (req, res) => {
    try {
        const empresas = await pool.query(
            `SELECT e.* FROM empresas e JOIN empresa_usuarios_mobile eum ON e.id = eum.empresa_id WHERE eum.usuario_id = $1 AND e.is_ativa = true`,
            [req.usuarioId]
        );
        res.status(200).json(empresas.rows);
    } catch (error) { if (res) res.status(500).json({ error: 'Erro.' }); }
};

const getImoveisDaEmpresaMobile = async (req, res) => {
    const { id: empresaId } = req.params;
    const mobileUserId = req.usuarioId;
    try {
        const acesso = await pool.query('SELECT * FROM empresa_usuarios_mobile WHERE empresa_id = $1 AND usuario_id = $2', [empresaId, mobileUserId]);
        if (acesso.rows.length === 0) return res.status(403).json({ error: 'Acesso negado.' });

        const imoveisRes = await pool.query(
            `SELECT im.*, um.nome AS visitante_nome, um.sobrenome AS visitante_sobrenome 
             FROM imoveis im LEFT JOIN usuarios_mobile um ON im.visitante_atual_id = um.id 
             WHERE im.empresa_id = $1 AND im.is_vendido = false`, [empresaId]
        );
        
        const imoveis = imoveisRes.rows;
        const imovelIds = imoveis.map(i => i.id);
        
        if (imovelIds.length === 0) return res.status(200).json([]);

        const fotos = await pool.query('SELECT * FROM fotos_imoveis WHERE imovel_id = ANY($1::int[])', [imovelIds]);
        const docs = await pool.query('SELECT * FROM documentos WHERE imovel_id = ANY($1::int[])', [imovelIds]);

        const resultado = imoveis.map(im => ({
            ...im,
            visitante_nome_completo: im.visitante_nome ? `${im.visitante_nome} ${im.visitante_sobrenome}` : null,
            fotos: fotos.rows.filter(f => f.imovel_id === im.id),
            documentos: docs.rows.filter(d => d.imovel_id === im.id)
        }));
        res.status(200).json(resultado);
    } catch (error) { if (res) res.status(500).json({ error: 'Erro.' }); }
};

module.exports = { reservarVisita, finalizarVisita, getMe, getMinhasEmpresas, getImoveisDaEmpresaMobile };