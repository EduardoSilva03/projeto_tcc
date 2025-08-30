import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

function EditUser() {
    const { userId } = useParams();
    const { token } = useContext(AuthContext);

    const [userData, setUserData] = useState({ nome: '', sobrenome: '', email: '' });
    const [novaSenha, setNovaSenha] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            if (token) {
                try {
                    const headers = { 'Authorization': `Bearer ${token}` };
                    const response = await axios.get(`http://localhost:5000/mobile-users/${userId}`, { headers });
                    setUserData(response.data);
                } catch (err) {
                    setError('Não foi possível carregar os dados do usuário.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchUserData();
    }, [userId, token]);

    const handleDetailsChange = (e) => {
        setUserData({ ...userData, [e.target.name]: e.target.value });
    };

    const handleDetailsSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.put(`http://localhost:5000/mobile-users/${userId}`, userData, { headers });
            setMessage(response.data.message);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao atualizar os dados.');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.patch(`http://localhost:5000/mobile-users/${userId}/password`, { novaSenha }, { headers });
            setMessage(response.data.message);
            setNovaSenha('');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao atualizar a senha.');
        }
    };

    if (loading) return <p>Carregando...</p>;

    return (
        <div className="edit-user-container">
            <Link to="/dashboard" className="back-link">← Voltar para o Dashboard</Link>
            <h1>Administrar Usuário: {userData.nome}</h1>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="form-container">
                <h2>Editar Informações</h2>
                <form onSubmit={handleDetailsSubmit}>
                    <label>Nome:</label>
                    <input type="text" name="nome" value={userData.nome} onChange={handleDetailsChange} required />
                    <label>Sobrenome:</label>
                    <input type="text" name="sobrenome" value={userData.sobrenome} onChange={handleDetailsChange} required />
                    <label>E-mail:</label>
                    <input type="email" name="email" value={userData.email} onChange={handleDetailsChange} required />
                    <button type="submit">Salvar Alterações</button>
                </form>
            </div>

            <div className="form-container">
                <h2>Alterar Senha</h2>
                <form onSubmit={handlePasswordSubmit}>
                    <label>Nova Senha:</label>
                    <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Digite a nova senha" required />
                    <button type="submit">Alterar Senha</button>
                </form>
            </div>
        </div>
    );
}

export default EditUser;