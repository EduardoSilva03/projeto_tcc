import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

function Dashboard() {
    const { logOut, token } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        nome: '',
        sobrenome: '',
        email: '',
        senha: '',
    });
    const [mensagem, setMensagem] = useState('');
    const [erro, setErro] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensagem('');
        setErro('');

        try {
            const headers = {
                'Authorization': `Bearer ${token}`
            };
            const response = await axios.post('http://localhost:5000/cadastro-mobile', formData, { headers });
            setMensagem(response.data.message);
            setFormData({ nome: '', sobrenome: '', email: '', senha: '' });
        } catch (error) {
            setErro(error.response?.data?.error || 'Ocorreu um erro ao cadastrar usuário mobile.');
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Painel Administrativo</h1>
                <button onClick={logOut} className="logout-button">Sair</button>
            </header>
            
            <div className="form-container">
                <h2>Cadastrar Novo Usuário Mobile</h2>
                <form onSubmit={handleSubmit}>
                    <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome" required />
                    <input type="text" name="sobrenome" value={formData.sobrenome} onChange={handleChange} placeholder="Sobrenome" required />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-mail" required />
                    <input type="password" name="senha" value={formData.senha} onChange={handleChange} placeholder="Senha Provisória" required />
                    <button type="submit">Cadastrar Usuário Mobile</button>
                </form>
                {mensagem && <p className="success-message">{mensagem}</p>}
                {erro && <p className="error-message">{erro}</p>}
            </div>
        </div>
    );
}

export default Dashboard;