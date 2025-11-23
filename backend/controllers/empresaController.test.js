const { deleteEmpresa, desvincularUsuario, createEmpresa, vincularUsuario, getEmpresas, getEmpresaById } = require('./empresaController');
const pool = require('../db');

jest.mock('../db');

describe('Controller: Empresas - Delete', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('deleteEmpresa', () => {
        it('deve excluir uma empresa com sucesso', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rowCount: 1 });

            const req = { params: { id: 1 }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await deleteEmpresa(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Empresa excluída com sucesso!' });
        });

        it('deve retornar 404 se a empresa não for encontrada', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const req = { params: { id: 1 }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await deleteEmpresa(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('desvincularUsuario', () => {
        it('deve desvincular usuário com sucesso', async () => {
            pool.query.mockResolvedValueOnce({});

            const req = { params: { empresaId: 1, usuarioId: 2 } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await desvincularUsuario(req, res);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM empresa_usuarios_mobile'),
                [1, 2]
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});

describe('Controller: Empresas - Post', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('createEmpresa', () => {
        it('deve criar empresa se CNPJ for único', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 10, cnpj: '123' }] });

            const req = { body: { cnpj: '123', razao_social: 'Empresa X' }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await createEmpresa(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('vincularUsuario', () => {
        it('deve vincular com sucesso', async () => {
            pool.query.mockResolvedValueOnce({});

            const req = { params: { empresaId: 1 }, body: { usuario_mobile_id: 5 } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await vincularUsuario(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});

describe('Controller: Empresas - GET', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('getEmpresas', () => {
        it('deve retornar lista de empresas', async () => {
            const listaMock = [{ id: 1, nome: 'Empresa A' }, { id: 2, nome: 'Empresa B' }];
            pool.query.mockResolvedValueOnce({ rows: listaMock });

            const req = { usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await getEmpresas(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(listaMock);
        });
    });

    describe('getEmpresaById', () => {
        it('deve retornar a empresa se encontrada', async () => {
            const empresaMock = { id: 1, nome: 'Empresa A' };
            pool.query.mockResolvedValueOnce({ rows: [empresaMock] });

            const req = { params: { id: 1 }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await getEmpresaById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(empresaMock);
        });

        it('deve retornar 404 se não encontrar', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const req = { params: { id: 999 }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await getEmpresaById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});