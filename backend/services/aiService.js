const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GOOGLE_API_KEY = 'AIzaSyDTuAV_u0Cpwxo2lcQ6YKG2vD6r1RkHDhw';

function extractCoordsFromMapLink(url) {
    if (!url) return null;
    try {
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match && match[1] && match[2]) {
            return { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) };
        }
    } catch (e) {
        console.error("Erro ao extrair coordenadas:", e.message);
    }
    return null;
}

async function fetchNearbyPlaces(latitude, longitude) {
    const radius = 1000;
    const types = ['school', 'supermarket', 'pharmacy', 'park', 'restaurant'];
    const url = `https://places.googleapis.com/v1/places:searchNearby`;

    const body = {
        includedTypes: types,
        maxResultCount: 10,
        locationRestriction: {
            circle: {
                center: { latitude, longitude },
                radius: radius
            }
        },
        languageCode: "pt-BR"
    };

    const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.types,places.location'
    };

    try {
        const response = await axios.post(url, body, { headers });
        if (!response.data || !response.data.places) return [];
        
        return response.data.places.map(place => ({
            nome: place.displayName.text,
            tipo: place.types[0],
        }));
    } catch (error) {
        const msg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('Erro no Google Places:', msg);
        return null;
    }
}

async function generateAIDescription(placesData) {
    if (!placesData || placesData.length === 0) return null;

    const placesString = placesData.map(p => `- ${p.nome} (tipo: ${p.tipo})`).join('\n');
    
    let vocabularioCorretor = "";
    try {
        const vocabPath = path.join(__dirname, '..', 'vocabulario_corretor.txt');
        if (fs.existsSync(vocabPath)) {
            vocabularioCorretor = fs.readFileSync(vocabPath, 'utf8');
        }
    } catch (err) {
        console.error("Aviso: Não foi possível ler vocabulario_corretor.txt");
    }

    const prompt = `
        Você é um corretor de imóveis experiente.
        Escreva uma descrição curta e atraente (máximo 3 frases) sobre a localização deste imóvel.

        GUIA DE ESTILO:
        ${vocabularioCorretor}
        
        PONTOS DE INTERESSE PRÓXIMOS:
        ${placesString}

        INSTRUÇÃO IMPORTANTE:
        Cite nominalmente alguns dos estabelecimentos listados acima (ex: "próximo ao Mercado X" ou "ao lado da Padaria Y") para dar credibilidade e mostrar a conveniência real da localização.
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
    
    const body = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = await axios.post(url, body);
        if (response.data && response.data.candidates && response.data.candidates[0]) {
            return response.data.candidates[0].content.parts[0].text;
        }
        return null;
    } catch (error) {
        const msg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('Erro no Gemini:', msg);
        return null;
    }
}

module.exports = {
    extractCoordsFromMapLink,
    fetchNearbyPlaces,
    generateAIDescription
};