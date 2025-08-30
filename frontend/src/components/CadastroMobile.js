import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function CadastroMobile() {
    const { token } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        nome: '',
        sobrenome: '',
        email: '',
        senha: '',
    });
    const [mensagem, setMensagem] = useState('');
    const [erro, setErro] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensagem('');
        setErro('');

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.post('http://localhost:5000/cadastro-mobile', formData, { headers });
            setMensagem(response.data.message);
            setFormData({ nome: '', sobrenome: '', email: '', senha: '' });
        } catch (error) {
            setErro(error.response?.data?.error || 'Ocorreu um erro ao cadastrar usuário mobile.');
        }
    };

    return (
        <div className="form-container" style={{ margin: '20px auto' }}>
            <Link to="/dashboard" className="back-link">← Voltar para o Dashboard</Link>
            <h2>Cadastrar Novo Usuário Mobile</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome" required />
                <input type="text" name="sobrenome" value={formData.sobrenome} onChange={handleChange} placeholder="Sobrenome" required />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-mail" required />
                <input type="password" name="senha" value={formData.senha} onChange={handleChange} placeholder="Senha Provisória" required />
                <button type="submit">Cadastrar Usuário</button>
            </form>
            {mensagem && <p className="success-message">{mensagem}</p>}
            {erro && <p className="error-message">{erro}</p>}
        </div>
    );
}

export default CadastroMobile;