const { deleteMobileUser, getAllMobileUsers, getMobileUsersByEmpresa } = require('./mobileUserController');
const pool = require('../db');

jest.mock('../db');

describe('Controller: Mobile Users - Delete', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('deve excluir um usuário com sucesso (Status 200)', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 1 }] })
            .mockResolvedValueOnce({ rowCount: 1 });

        const req = {
            params: { id: 1 },
            usuarioId: 99
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await deleteMobileUser(req, res);

        // VERIFICAÇÕES
        expect(pool.query).toHaveBeenCalledTimes(2);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Usuário mobile excluído com sucesso!' });
    });

    it('deve retornar erro 404 se o usuário não pertencer ao admin', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const req = { params: { id: 2 }, usuarioId: 99 };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await deleteMobileUser(req, res);

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            error: expect.stringContaining('não encontrado') 
        }));
    });

    it('deve retornar erro 500 se o banco de dados falhar', async () => {
        pool.query.mockRejectedValue(new Error('Erro de Conexão'));
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = { params: { id: 1 }, usuarioId: 99 };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await deleteMobileUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        
        consoleSpy.mockRestore();
    });
});

describe('Controller: Mobile Users - GET', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('getAllMobileUsers', () => {
        it('deve listar usuários do admin', async () => {
            const mockUsers = [{ id: 1, nome: 'João' }];
            pool.query.mockResolvedValueOnce({ rows: mockUsers });

            const req = { usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await getAllMobileUsers(req, res);

            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [99]);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockUsers);
        });
    });
});