import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Building2, UserPlus, LogOut, Settings, Plus, Trash2 } from 'lucide-react';

function ConfirmationModal({ message, onConfirm, onCancel, loading }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="form-container" style={{maxWidth: '400px', margin: 0}}>
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

function Dashboard() {
    const { logOut, token } = useContext(AuthContext);
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [empresaToDelete, setEmpresaToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

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

    useEffect(() => {
        if (token) fetchEmpresas();
    }, [token]);

    const handleDeleteClick = (empresa) => {
        setEmpresaToDelete(empresa);
    };

    const handleConfirmDelete = async () => {
        if (!empresaToDelete) return;
        setDeleteLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.delete(`http://localhost:5000/empresas/${empresaToDelete.id}`, { headers });
            
            setEmpresas(empresas.filter(e => e.id !== empresaToDelete.id));
            setEmpresaToDelete(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Erro ao excluir empresa.');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="dashboard-container">
            {empresaToDelete && (
                <ConfirmationModal
                    message={`Tem certeza que deseja excluir a empresa "${empresaToDelete.nome_fantasia || empresaToDelete.razao_social}"? Isso apagará TODOS os imóveis, fotos e vínculos de usuários associados a ela.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setEmpresaToDelete(null)}
                    loading={deleteLoading}
                />
            )}

            <header className="dashboard-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <Building2 size={32} color="#2563eb" />
                    <h1>Painel de Controle</h1>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                    <Link to="/dashboard/cadastro-mobile" className="button-add" style={{backgroundColor: '#17a2b8', textDecoration: 'none'}}>
                        <UserPlus size={18} style={{marginRight: '8px'}}/>
                        Gerenciar Usuários Mobile
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
                                            <td style={{textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                                                <Link to={`/dashboard/empresa/${empresa.id}`} className="button-admin">
                                                    <Settings size={16} style={{marginRight: '5px'}}/>
                                                    Gerenciar
                                                </Link>
                                                <button 
                                                    onClick={() => handleDeleteClick(empresa)} 
                                                    className="logout-button" 
                                                    style={{padding: '6px 12px', fontSize: '0.85rem'}}
                                                    title="Excluir Empresa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
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