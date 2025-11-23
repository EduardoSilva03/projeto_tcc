const { reservarVisita, finalizarVisita } = require('./mobileAppController');
const pool = require('../db');

jest.mock('../db');

describe('Controller: Mobile App Features', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('reservarVisita', () => {
        it('deve reservar se imóvel estiver livre', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ visitante_atual_id: null }] })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ rows: [{ nome: 'João', sobrenome: 'Silva' }] });

            const req = { params: { id: 1 }, usuarioId: 10 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await reservarVisita(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reservado!' }));
        });

        it('deve retornar 409 se já estiver ocupado', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ visitante_atual_id: 99 }] });

            const req = { params: { id: 1 }, usuarioId: 10 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await reservarVisita(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });
    });

    describe('finalizarVisita', () => {
        it('deve finalizar se for o visitante atual', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ visitante_atual_id: 10 }] })
                .mockResolvedValueOnce({});

            const req = { params: { id: 1 }, usuarioId: 10 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await finalizarVisita(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});