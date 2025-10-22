import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function CadastroMobile() {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nome: '',
        sobrenome: '',
        email: '',
        senha: '',
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.post('http://localhost:5000/cadastro-mobile', formData, { headers });
            
            setMessage('Usuário mobile cadastrado com sucesso!');
            setFormData({ nome: '', sobrenome: '', email: '', senha: '' });
            setTimeout(() => setMessage(''), 3000);
            
        } catch (error) {
            setError(error.response?.data?.error || 'Ocorreu um erro ao cadastrar usuário mobile.');
        }
    };

    return (
        <div className="form-container" style={{ margin: '20px auto' }}>
            <Link to="/dashboard" className="back-link">← Voltar para o Dashboard</Link>
            <h2>Cadastrar Novo Usuário Mobile (Global)</h2>
            <p style={{textAlign: 'center', marginTop: '-10px', marginBottom: '20px'}}>
                Após cadastrar, você deve ir na página da empresa para vincular este usuário.
            </p>
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
    );
}

export default CadastroMobile;