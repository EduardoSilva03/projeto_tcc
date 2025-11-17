import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

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
                <h1>Painel de Controle</h1>
                <div>
                    <Link to="/dashboard/cadastro-mobile" className="button-add" style={{backgroundColor: '#17a2b8', marginRight: '10px'}}>
                        Gerenciar Usuários Mobile
                    </Link>
                    <button onClick={logOut} className="logout-button">Sair</button>
                </div>
            </header>
            
            <div className="dashboard-content">
                <div className="users-header">
                    <h2>Minhas Empresas</h2>
                    <Link to="/dashboard/cadastro-empresa" className="button-add">
                        Cadastrar Nova Empresa
                    </Link>
                </div>
                
                {loading && <p>Carregando...</p>}
                {error && <p className="error-message">{error}</p>}
                
                {!loading && !error && (
                    empresas.length > 0 ? (
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Nome Fantasia</th>
                                    <th>Razão Social</th>
                                    <th>CNPJ</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empresas.map(empresa => (
                                    <tr key={empresa.id}>
                                        <td>{empresa.nome_fantasia || 'N/A'}</td>
                                        <td>{empresa.razao_social}</td>
                                        <td>{empresa.cnpj}</td>
                                        <td>{empresa.is_ativa ? 'Ativa' : 'Inativa'}</td>
                                        <td>
                                            <Link to={`/dashboard/empresa/${empresa.id}`} className="button-admin">
                                                Administrar
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>Nenhuma empresa cadastrada ainda.</p>
                    )
                )}
            </div>
        </div>
    );
}

export default Dashboard;