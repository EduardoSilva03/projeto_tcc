import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Building2, UserPlus, LogOut, Settings, Plus } from 'lucide-react';

function Dashboard() {
    const { logOut, token } = useContext(AuthContext);
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            const fetchEmpresas = async () => {
                try {
                    const headers = { 'Authorization': `Bearer ${token}` };
                    const response = await axios.get('http://localhost:5000/empresas', { headers });
                    setEmpresas(response.data);
                } catch (err) {
                    setError('Não foi possível carregar as empresas.');
                } finally {
                    setLoading(false);
                }
            };
            fetchEmpresas();
        }
    }, [token]);

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <Building2 size={32} color="#2563eb" />
                    <h1>Painel de Controle</h1>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                    <Link to="/dashboard/cadastro-mobile" className="button-add" style={{backgroundColor: '#64748b'}}>
                        <UserPlus size={18} style={{marginRight: '8px'}}/>
                        Usuários Mobile
                    </Link>
                    <button onClick={logOut} className="logout-button">
                        <LogOut size={18} style={{marginRight: '8px'}}/>
                        Sair
                    </button>
                </div>
            </header>
            
            <div className="dashboard-content">
                <div className="users-header" style={{borderBottom: '1px solid #e5e7eb', paddingBottom: '15px', marginBottom: '20px'}}>
                    <h2 style={{margin: 0, fontSize: '1.25rem'}}>Minhas Empresas</h2>
                    <Link to="/dashboard/cadastro-empresa" className="button-add">
                        <Plus size={18} style={{marginRight: '8px'}}/>
                        Nova Empresa
                    </Link>
                </div>
                
                {loading && <p style={{textAlign: 'center', padding: '20px'}}>Carregando...</p>}
                {error && <p className="error-message">{error}</p>}
                
                {!loading && !error && (
                    empresas.length > 0 ? (
                        <div style={{overflowX: 'auto'}}>
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Nome Fantasia</th>
                                        <th>Razão Social</th>
                                        <th>CNPJ</th>
                                        <th>Status</th>
                                        <th style={{textAlign: 'right'}}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {empresas.map(empresa => (
                                        <tr key={empresa.id}>
                                            <td style={{fontWeight: '500'}}>{empresa.nome_fantasia || 'N/A'}</td>
                                            <td>{empresa.razao_social}</td>
                                            <td>{empresa.cnpj}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 8px', 
                                                    borderRadius: '12px', 
                                                    fontSize: '0.75rem',
                                                    backgroundColor: empresa.is_ativa ? '#d1fae5' : '#f3f4f6',
                                                    color: empresa.is_ativa ? '#065f46' : '#374151',
                                                    fontWeight: '600'
                                                }}>
                                                    {empresa.is_ativa ? 'ATIVA' : 'INATIVA'}
                                                </span>
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                <Link to={`/dashboard/empresa/${empresa.id}`} className="button-admin">
                                                    <Settings size={16} style={{marginRight: '5px'}}/>
                                                    Gerenciar
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
                            <Building2 size={48} style={{marginBottom: '10px', opacity: 0.5}}/>
                            <p>Nenhuma empresa cadastrada ainda.</p>
                            <Link to="/dashboard/cadastro-empresa" style={{color: '#2563eb', fontWeight: '500'}}>Comece criando uma agora</Link>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default Dashboard;