const { register, login } = require('./authController');
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../db');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Controller: Auth - POST', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('register', () => {
        it('deve cadastrar um novo usuário com sucesso', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 1, email: 'teste@teste.com' }] });

            bcrypt.hash.mockResolvedValue('hash_senha');

            const req = { body: { nome: 'Teste', email: 'teste@teste.com', senha: '123' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await register(req, res);

            expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('deve retornar erro se email já existe', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            
            const req = { body: { email: 'existe@teste.com' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('login', () => {
        it('deve gerar token se credenciais estiverem corretas', async () => {
            pool.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, email: 't@t.com', senha_hash: 'hash_valido' }] 
            });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token_falso');

            const req = { body: { email: 't@t.com', senha: '123' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'token_falso' }));
        });
    });
});