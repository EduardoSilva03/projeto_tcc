const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const authController = require('./controllers/authController');
const empresaController = require('./controllers/empresaController');
const imovelController = require('./controllers/imovelController');
const mobileUserController = require('./controllers/mobileUserController');
const mobileAppController = require('./controllers/mobileAppController');

const app = express();
const PORT = 5000;
const SEGREDO_JWT = 'seu-segredo-super-secreto-para-jwt';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    limits: { fileSize: 25 * 1024 * 1024 }
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

app.post('/cadastro', authController.register);
app.post('/login', authController.login);
app.post('/login-mobile', authController.loginMobile);
app.post('/empresas', verificarToken, empresaController.createEmpresa);
app.get('/empresas', verificarToken, empresaController.getEmpresas);
app.get('/empresas/:id', verificarToken, empresaController.getEmpresaById);
app.delete('/empresas/:id', verificarToken, empresaController.deleteEmpresa);
app.post('/empresas/:empresaId/vincular-usuario', verificarToken, empresaController.vincularUsuario);
app.delete('/empresas/:empresaId/desvincular-usuario/:usuarioId', verificarToken, empresaController.desvincularUsuario);
app.get('/empresas/:empresaId/mobile-users', verificarToken, mobileUserController.getMobileUsersByEmpresa);
app.post('/empresas/:empresaId/imoveis', verificarToken, imovelController.createImovel);
app.get('/empresas/:empresaId/imoveis', verificarToken, imovelController.getImoveisByEmpresa);
app.get('/imoveis/:id', verificarToken, imovelController.getImovelById);
app.delete('/imoveis/:id', verificarToken, imovelController.deleteImovel);
app.post('/imoveis/:id/fotos', verificarToken, upload.single('foto'), imovelController.addFoto);
app.delete('/imoveis/fotos/:id', verificarToken, imovelController.deleteFoto);
app.post('/imoveis/:id/documentos', verificarToken, imovelController.addDocumento);
app.post('/cadastro-mobile', verificarToken, mobileUserController.createMobileUser);
app.get('/mobile-users', verificarToken, mobileUserController.getAllMobileUsers);
app.get('/mobile-users/:id', verificarToken, mobileUserController.getMobileUserById);
app.put('/mobile-users/:id', verificarToken, mobileUserController.updateMobileUser);
app.patch('/mobile-users/:id/password', verificarToken, mobileUserController.updateMobileUserPassword);
app.delete('/mobile-users/:id', verificarToken, mobileUserController.deleteMobileUser);
app.get('/mobile-users/desvinculados/:empresaId', verificarToken, mobileUserController.getDesvinculados);
app.get('/mobile/me', verificarToken, mobileAppController.getMe);
app.get('/mobile/minhas-empresas', verificarToken, mobileAppController.getMinhasEmpresas);
app.get('/mobile/empresas/:id/imoveis', verificarToken, mobileAppController.getImoveisDaEmpresaMobile);
app.patch('/mobile/imoveis/:id/reservar-visita', verificarToken, mobileAppController.reservarVisita);
app.patch('/mobile/imoveis/:id/finalizar-visita', verificarToken, mobileAppController.finalizarVisita);

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
    }
});