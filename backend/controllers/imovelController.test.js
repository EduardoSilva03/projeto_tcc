const { deleteImovel, deleteFoto, createImovel, getImoveisByEmpresa, getImovelById } = require('./imovelController');
const pool = require('../db');
const fs = require('fs');
const aiService = require('../services/aiService');

jest.mock('../db');
jest.mock('fs');
jest.mock('../services/aiService');

describe('Controller: Imóveis - Delete', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('deleteImovel', () => {
        it('deve excluir imóvel e tentar apagar arquivos', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 10 }] })
                .mockResolvedValueOnce({ rows: [{ link_foto: 'http://api/uploads/foto1.jpg' }] })
                .mockResolvedValueOnce({});

            fs.existsSync.mockReturnValue(true);
            fs.unlinkSync.mockImplementation(() => {});

            const req = { params: { id: 10 }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await deleteImovel(req, res);

            expect(fs.unlinkSync).toHaveBeenCalled(); 
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('deve retornar 404 se o imóvel não for do usuário', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const req = { params: { id: 10 }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await deleteImovel(req, res);
            
            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('deleteFoto', () => {
        it('deve excluir foto única', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ link_foto: 'http://api/uploads/foto2.jpg' }] })
                .mockResolvedValueOnce({});

            fs.existsSync.mockReturnValue(true);
            
            const req = { params: { id: 50 }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await deleteFoto(req, res);

            expect(fs.unlinkSync).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});

describe('Controller: Imóveis - Post', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('createImovel', () => {
        it('deve criar imóvel e chamar o serviço de IA se houver link do maps', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [{ id: 100, link_google_maps: 'http://maps...' }] })
                .mockResolvedValueOnce({});

            aiService.extractCoordsFromMapLink.mockReturnValue({ lat: 10, lng: 20 });
            aiService.fetchNearbyPlaces.mockResolvedValue([{ nome: 'Padaria' }]);
            aiService.generateAIDescription.mockResolvedValue('Texto gerado pela IA');

            const req = { 
                params: { empresaId: 1 }, 
                body: { nome_residencial: 'Teste', link_google_maps: 'http://maps...' },
                usuarioId: 99 
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await createImovel(req, res);

            expect(res.status).toHaveBeenCalledWith(201);

            expect(aiService.extractCoordsFromMapLink).toHaveBeenCalled();
        });
    });
});

describe('Controller: Imóveis - GET', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('getImovelById', () => {
        it('deve retornar imóvel completo com fotos e documentos', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Casa' }] })
                .mockResolvedValueOnce({ rows: [{ link: 'foto1.jpg' }] })
                .mockResolvedValueOnce({ rows: [{ titulo: 'Doc 1' }] });

            const req = { params: { id: 1 }, usuarioId: 99 };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await getImovelById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                id: 1,
                nome: 'Casa',
                fotos: [{ link: 'foto1.jpg' }],
                documentos: [{ titulo: 'Doc 1' }]
            });
        });
    });
});