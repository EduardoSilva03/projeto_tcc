import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useParams } from 'react-router-dom';

function GerenciarUsuarios({ empresaId, token }) {
    const [usuariosVinculados, setUsuariosVinculados] = useState([]);
    const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const resVinculados = await axios.get(`http://localhost:5000/empresas/${empresaId}/mobile-users`, { headers });
            setUsuariosVinculados(resVinculados.data);

            const resDisponiveis = await axios.get(`http://localhost:5000/mobile-users/desvinculados/${empresaId}`, { headers });
            setUsuariosDisponiveis(resDisponiveis.data);
            if (resDisponiveis.data.length > 0) {
                setUsuarioSelecionado(resDisponiveis.data[0].id);
            }
        } catch (err) { setError('Erro ao buscar usuários.'); }
    };

    useEffect(() => { fetchData(); }, [empresaId, token]);

    const handleVincular = async (e) => {
        e.preventDefault();
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.post(`http://localhost:5000/empresas/${empresaId}/vincular-usuario`, { usuario_mobile_id: usuarioSelecionado }, { headers });
            fetchData();
        } catch (err) { setError('Erro ao vincular usuário.'); }
    };

    const handleDesvincular = async (usuarioId) => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.delete(`http://localhost:5000/empresas/${empresaId}/desvincular-usuario/${usuarioId}`, { headers });
            fetchData();
        } catch (err) { setError('Erro ao desvincular usuário.'); }
    };

    return (
        <div className="dashboard-content" style={{ marginTop: '20px' }}>
            <div className="users-header">
                <h2>Usuários Mobile Vinculados</h2>
            </div>
            {error && <p className="error-message">{error}</p>}
            
            <form onSubmit={handleVincular} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <select value={usuarioSelecionado} onChange={(e) => setUsuarioSelecionado(e.target.value)} style={{flex: 1, padding: '10px'}}>
                    <option value="">Selecione um usuário para vincular</option>
                    {usuariosDisponiveis.map(user => (
                        <option key={user.id} value={user.id}>{user.nome} {user.sobrenome} ({user.email})</option>
                    ))}
                </select>
                <button type="submit" className="button-add" style={{ width: 'auto' }}>Vincular</button>
            </form>

            <table className="users-table">
                <thead><tr><th>Nome</th><th>Email</th><th>Ações</th></tr></thead>
                <tbody>
                    {usuariosVinculados.length > 0 ? usuariosVinculados.map(user => (
                        <tr key={user.id}>
                            <td>{user.nome} {user.sobrenome}</td>
                            <td>{user.email}</td>
                            <td>
                                <button onClick={() => handleDesvincular(user.id)} className="logout-button" style={{width: 'auto', fontSize: '14px'}}>
                                    Desvincular
                                </button>
                            </td>
                        </tr>
                    )) : <tr><td colSpan="3">Nenhum usuário vinculado a esta empresa.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

function EmpresaDetalhes() {
    const { empresaId } = useParams();
    const { token } = useContext(AuthContext);
    
    const [empresa, setEmpresa] = useState(null);
    const [imoveis, setImoveis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token && empresaId) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const headers = { 'Authorization': `Bearer ${token}` };
                    const [empresaRes, imoveisRes] = await Promise.all([
                        axios.get(`http://localhost:5000/empresas/${empresaId}`, { headers }),
                        axios.get(`http://localhost:5000/empresas/${empresaId}/imoveis`, { headers })
                    ]);
                    setEmpresa(empresaRes.data);
                    setImoveis(imoveisRes.data);
                } catch (err) {
                    setError('Não foi possível carregar os dados da empresa.');
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [token, empresaId]);

    if (loading) return <p>Carregando...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!empresa) return <p>Empresa não encontrada.</p>;

    return (
        <div className="dashboard-container">
            <Link to="/dashboard" className="back-link">← Voltar para o Dashboard</Link>
            <header className="dashboard-header">
                <h1>{empresa.nome_fantasia || empresa.razao_social}</h1>
            </header>
            
            <div className="dashboard-content">
                <h3>Detalhes da Empresa</h3>
                <p><strong>Razão Social:</strong> {empresa.razao_social}</p>
                <p><strong>CNPJ:</strong> {empresa.cnpj}</p>
                <p><strong>Situação:</strong> {empresa.is_ativa ? 'Ativa' : 'Inativa'}</p>
            </div>

            <div className="dashboard-content" style={{marginTop: '20px'}}>
                <div className="users-header">
                    <h2>Imóveis da Empresa</h2>
                    <Link to={`/dashboard/empresa/${empresaId}/cadastro-imovel`} className="button-add">
                        Cadastrar Novo Imóvel
                    </Link>
                </div>
                {imoveis.length > 0 ? (
                    <table className="users-table">
                        <thead><tr><th>Residencial</th><th>Unidade</th><th>Situação</th><th>Valor</th><th>Ações</th></tr></thead>
                        <tbody>
                            {imoveis.map(imovel => (
                                <tr key={imovel.id}>
                                    <td>{imovel.nome_residencial}</td>
                                    <td>{imovel.unidade}</td>
                                    <td>{imovel.situacao}</td>
                                    <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor)}</td>
                                    <td>
                                        <Link to={`/dashboard/imovel/${imovel.id}`} className="button-admin">
                                            Detalhes
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p>Nenhum imóvel cadastrado para esta empresa.</p>}
            </div>

            <GerenciarUsuarios empresaId={empresaId} token={token} />
        </div>
    );
}

export default EmpresaDetalhes;