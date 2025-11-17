import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useParams, useNavigate } from 'react-router-dom'; 
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

function ConfirmationModal({ message, onConfirm, onCancel, loading }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="form-container" style={{maxWidth: '400px'}}>
                <h3>Confirmar Exclusão</h3>
                <p>{message}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '20px'}}>
                    <button onClick={onCancel} style={{backgroundColor: '#6c757d', width: '48%'}} disabled={loading}>
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="logout-button" style={{width: '48%'}} disabled={loading}>
                        {loading ? 'Excluindo...' : 'Excluir'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ImovelDetalhes() {
    const { imovelId } = useParams();
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [imovel, setImovel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

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

    const handleFotoExcluida = (fotoIdExcluida) => {
        setImovel(imovelAtual => ({
            ...imovelAtual,
            fotos: imovelAtual.fotos.filter(foto => foto.id !== fotoIdExcluida)
        }));
    };

    const handleConfirmDeleteImovel = async () => {
        setDeleteLoading(true);
        setDeleteError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.delete(`http://localhost:5000/imoveis/${imovelId}`, { headers });
            setShowConfirmModal(false);
            navigate(`/dashboard/empresa/${imovel.empresa_id}`);
        } catch (err) {
            setDeleteError(err.response?.data?.error || 'Erro ao excluir o imóvel. Tente novamente.');
            setShowConfirmModal(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteFoto = async (fotoId) => {
        if (!window.confirm("Tem certeza que deseja excluir esta foto?")) return;

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.delete(`http://localhost:5000/imoveis/fotos/${fotoId}`, { headers });
            handleFotoExcluida(fotoId);
        } catch (err) {
            alert('Erro ao excluir foto.');
        }
    };

    if (loading) return <p>Carregando...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!imovel) return <p>Imóvel não encontrado.</p>;

    return (
        <div className="dashboard-container">
            {showConfirmModal && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir este imóvel? Todas as fotos e documentos associados serão perdidos permanentemente."
                    onConfirm={handleConfirmDeleteImovel}
                    onCancel={() => setShowConfirmModal(false)}
                    loading={deleteLoading}
                />
            )}

            <Link to={`/dashboard/empresa/${imovel.empresa_id}`} className="back-link">← Voltar para Empresa</Link>
            <header className="dashboard-header">
                <h1>{imovel.nome_residencial} - {imovel.unidade}</h1>
                <button 
                    onClick={() => setShowConfirmModal(true)} 
                    className="logout-button"
                    disabled={deleteLoading}
                >
                    Excluir Imóvel
                </button>
            </header>

            {deleteError && <p className="error-message" style={{textAlign: 'center'}}>{deleteError}</p>}

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
                <h3>Gerenciar Fotos</h3>
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Preview</th>
                            <th>Título</th>
                            <th>Foto</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {imovel.fotos && imovel.fotos.length > 0 ? imovel.fotos.map(foto => (
                            <tr key={foto.id}>
                                <td>
                                    <img src={foto.link_foto} alt={foto.titulo} style={{width: '100px', height: 'auto', borderRadius: '4px'}} />
                                </td>
                                <td>{foto.titulo || '(Sem título)'}</td>
                                <td>
                                    <a href={foto.link_foto} target="_blank" rel="noopener noreferrer">Ver</a>
                                </td>
                                <td>
                                    <button 
                                        onClick={() => handleDeleteFoto(foto.id)} 
                                        className="logout-button" 
                                        style={{fontSize: '14px', width: 'auto', padding: '8px 12px'}}
                                    >
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4">Nenhuma foto enviada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

             <div className="dashboard-content" style={{marginTop: '20px'}}>
                <h3>Documentos</h3>
                <ul>
                    {imovel.documentos && imovel.documentos.length > 0 ? imovel.documentos.map(doc => (
                        <li key={doc.id}>
                            <a href={doc.link_documento} target="_blank" rel="noopener noreferrer">{doc.titulo}</a>
                        </li>
                    )) : <p>Nenhum documento cadastrado.</p>}
                </ul>
             </div>
        </div>
    );
}

export default ImovelDetalhes;