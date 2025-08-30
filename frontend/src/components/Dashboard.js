import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function Dashboard() {
    const { logOut, token } = useContext(AuthContext);
    const [mobileUsers, setMobileUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            const fetchMobileUsers = async () => {
                try {
                    const headers = { 'Authorization': `Bearer ${token}` };
                    const response = await axios.get('http://localhost:5000/mobile-users', { headers });
                    setMobileUsers(response.data);
                } catch (err) {
                    setError('Não foi possível carregar os usuários.');
                } finally {
                    setLoading(false);
                }
            };

            fetchMobileUsers();
        }
    }, [token]);

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Painel de Controle</h1>
                <button onClick={logOut} className="logout-button">Sair</button>
            </header>
            
            <div className="dashboard-content">
                <div className="users-header">
                    <h2>Usuários Mobile Cadastrados</h2>
                    <Link to="/dashboard/cadastro-mobile" className="button-add">
                        Cadastrar Novo Usuário
                    </Link>
                </div>
                
                {loading && <p>Carregando usuários...</p>}
                {error && <p className="error-message">{error}</p>}
                
                {!loading && !error && (
                    mobileUsers.length > 0 ? (
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Sobrenome</th>
                                    <th>Email</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mobileUsers.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.nome}</td>
                                        <td>{user.sobrenome}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <Link to={`/dashboard/user/${user.id}`} className="button-admin">
                                                Administrar
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>Nenhum usuário mobile cadastrado ainda.</p>
                    )
                )}
            </div>
        </div>
    );
}

export default Dashboard;