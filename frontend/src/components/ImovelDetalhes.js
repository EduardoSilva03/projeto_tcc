import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useParams } from 'react-router-dom';
import ImovelCarousel from './ImovelCarousel';

function FormAdicionarFoto({ imovelId, token, onFotoAdicionada }) {
    const [foto, setFoto] = useState(null);
    const [titulo, setTitulo] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFoto(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!foto) {
            setError('Por favor, selecione um arquivo de foto.');
            return;
        }
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('foto', foto);

        try {
            const headers = { 
                'Authorization': `Bearer ${token}`,
            };
            
            const response = await axios.post(`http://localhost:5000/imoveis/${imovelId}/fotos`, formData, { headers });
            
            onFotoAdicionada(response.data);
            setFoto(null);
            setTitulo('');
            e.target.reset(); 
        } catch (err) {
            setError('Erro ao salvar foto.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-container" style={{maxWidth: '100%'}}>
            <h3>Adicionar Nova Foto</h3>
            
            <label>Arquivo da Foto:</label>
            <input 
                type="file" 
                onChange={handleFileChange} 
                accept="image/png, image/jpeg"
                required 
            />
            
            <label>Título/Descrição:</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            
            <button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Adicionar Foto'}
            </button>
            {error && <p className="error-message">{error}</p>}
        </form>
    );
}

function ImovelDetalhes() {
    const { imovelId } = useParams();
    const { token } = useContext(AuthContext);
    
    const [imovel, setImovel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchImovel = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.get(`http://localhost:5000/imoveis/${imovelId}`, { headers });
            setImovel(response.data);
        } catch (err) {
            setError('Não foi possível carregar os dados do imóvel.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchImovel();
    }, [token, imovelId]);

    const handleNovaFoto = (novaFoto) => {
        setImovel(imovelAtual => ({
            ...imovelAtual,
            fotos: [...imovelAtual.fotos, novaFoto]
        }));
    };

    if (loading) return <p>Carregando...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!imovel) return <p>Imóvel não encontrado.</p>;

    return (
        <div className="dashboard-container">
            <Link to={`/dashboard/empresa/${imovel.empresa_id}`} className="back-link">← Voltar para Empresa</Link>
            <header className="dashboard-header">
                <h1>{imovel.nome_residencial} - {imovel.unidade}</h1>
            </header>

            <ImovelCarousel fotos={imovel.fotos} />
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px'}}>
                <div className="dashboard-content">
                    <h3>Detalhes</h3>
                    <p><strong>Valor:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor)}</p>
                    <p><strong>Situação:</strong> {imovel.situacao}</p>
                    <p><strong>Endereço:</strong> {imovel.rua}, {imovel.numero} - {imovel.bairro}, {imovel.cidade}</p>
                </div>
                
                <FormAdicionarFoto imovelId={imovel.id} token={token} onFotoAdicionada={handleNovaFoto} />
            </div>

             <div className="dashboard-content" style={{marginTop: '20px'}}>
                <h3>Documentos</h3>
                <ul>
                    {imovel.documentos.map(doc => (
                        <li key={doc.id}>
                            <a href={doc.link_documento} target="_blank" rel="noopener noreferrer">{doc.titulo}</a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default ImovelDetalhes;