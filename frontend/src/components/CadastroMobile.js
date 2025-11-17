import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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

function CadastroMobile() {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nome: '',
        sobrenome: '',
        email: '',
        senha: '',
    });
    
    const [users, setUsers] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [listError, setListError] = useState('');

    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        setLoadingList(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.get('http://localhost:5000/mobile-users', { headers });
            setUsers(response.data);
        } catch (err) {
            setListError('Erro ao buscar usuários.');
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        if (token) fetchUsers();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.post('http://localhost:5000/cadastro-mobile', formData, { headers });
            
            setMessage('Usuário cadastrado com sucesso!');
            setFormData({ nome: '', sobrenome: '', email: '', senha: '' });
            
            setUsers([...users, response.data]);
            
        } catch (error) {
            setError(error.response?.data?.error || 'Ocorreu um erro ao cadastrar usuário.');
        }
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setDeleteLoading(true);
        setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.delete(`http://localhost:5000/mobile-users/${userToDelete.id}`, { headers });

            setUsers(users.filter(u => u.id !== userToDelete.id));
            setMessage('Usuário excluído com sucesso!');
            setUserToDelete(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao excluir usuário.');
            setUserToDelete(null);
        } finally {
            setDeleteLoading(false);
        }
    };


    return (
        <div className="dashboard-container">
            {userToDelete && (
                <ConfirmationModal
                    message={`Tem certeza que deseja excluir o usuário "${userToDelete.nome} ${userToDelete.sobrenome}"? Esta ação é permanente e irá desvinculá-lo de todas as empresas.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setUserToDelete(null)}
                    loading={deleteLoading}
                />
            )}

            <Link to="/dashboard" className="back-link">← Voltar para o Dashboard</Link>
            <h1>Gerenciar Usuários Mobile</h1>

            <div className="dashboard-content" style={{marginBottom: '30px'}}>
                <h2>Usuários Cadastrados</h2>
                {listError && <p className="error-message">{listError}</p>}
                {loadingList ? <p>Carregando...</p> : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.nome} {user.sobrenome}</td>
                                    <td>{user.email}</td>
                                    <td style={{display: 'flex', gap: '10px'}}>
                                        <Link 
                                            to={`/dashboard/user/${user.id}`} 
                                            className="button-admin" 
                                            style={{width: 'auto', textDecoration: 'none', padding: '8px 12px'}}
                                        >
                                            Editar
                                        </Link>
                                        <button 
                                            onClick={() => handleDeleteClick(user)} 
                                            className="logout-button" 
                                            style={{width: 'auto', fontSize: '14px', padding: '8px 12px'}}
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="3">Nenhum usuário mobile cadastrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="form-container" style={{ margin: '0 auto' }}>
                <h2>Cadastrar Novo Usuário</h2>
                <form onSubmit={handleSubmit}>
                    <label>Nome:</label>
                    <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
                    <label>Sobrenome:</label>
                    <input type="text" name="sobrenome" value={formData.sobrenome} onChange={handleChange} required />
                    <label>E-mail:</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                    <label>Senha Provisória:</label>
                    <input type="password" name="senha" value={formData.senha} onChange={handleChange} required />
                    <button type="submit">Cadastrar Usuário</button>
                </form>
                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}
            </div>
        </div>
    );
}

export default CadastroMobile;