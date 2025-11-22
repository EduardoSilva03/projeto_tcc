const axios = require('axios');
const fs = require('fs');
const { extractCoordsFromMapLink, fetchNearbyPlaces, generateAIDescription } = require('./aiService');

jest.mock('axios');
jest.mock('fs');

describe('Testes do Serviço de I.A.', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('extractCoordsFromMapLink', () => {
        it('deve extrair latitude e longitude corretamente de um link padrão', () => {
            const url = 'https://www.google.com/maps/place/Shopping/@-26.4800,-49.0700,17z/data=...';
            const result = extractCoordsFromMapLink(url);
            
            expect(result).toEqual({ latitude: -26.4800, longitude: -49.0700 });
        });

        it('deve retornar null se o link for inválido ou não tiver coordenadas', () => {
            const url = 'https://google.com';
            const result = extractCoordsFromMapLink(url);
            expect(result).toBeNull();
        });
    });

    describe('fetchNearbyPlaces', () => {
        it('deve retornar uma lista formatada de locais quando a API responde com sucesso', async () => {
            const mockGoogleResponse = {
                data: {
                    places: [
                        { displayName: { text: 'Mercado X' }, types: ['supermarket'] },
                        { displayName: { text: 'Escola Y' }, types: ['school'] }
                    ]
                }
            };
            axios.post.mockResolvedValue(mockGoogleResponse);

            const locais = await fetchNearbyPlaces(-26.0, -49.0);

            expect(locais).toHaveLength(2);
            expect(locais[0].nome).toBe('Mercado X');
        });

        it('deve retornar null em caso de erro na API', async () => {
            axios.post.mockRejectedValue(new Error('Erro de API'));
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const resultado = await fetchNearbyPlaces(-26.0, -49.0);

            expect(resultado).toBeNull();
            consoleSpy.mockRestore();
        });
    });

    describe('generateAIDescription', () => {
        it('deve ler o arquivo de vocabulário e chamar o Gemini corretamente', async () => {
            const placesData = [{ nome: 'Padaria A', tipo: 'bakery' }];
            const vocabularioMock = 'Use palavras como: sofisticado.';
            const respostaGeminiMock = {
                data: {
                    candidates: [{ content: { parts: [{ text: 'Descrição incrível gerada pela IA.' }] } }]
                }
            };

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(vocabularioMock);
            axios.post.mockResolvedValue(respostaGeminiMock);

            const descricao = await generateAIDescription(placesData);

            expect(descricao).toBe('Descrição incrível gerada pela IA.');
            
            const chamadaAxios = axios.post.mock.calls[0];
            const bodyEnviado = chamadaAxios[1];
            const promptEnviado = bodyEnviado.contents[0].parts[0].text;

            expect(promptEnviado).toContain('Padaria A');
            expect(promptEnviado).toContain(vocabularioMock);
        });
    });
});