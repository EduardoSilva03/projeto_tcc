import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function CadastroEmpresa() {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        cnpj: '',
        razao_social: '',
        nome_fantasia: '',
        data_abertura: '',
        natureza_juridica: '',
        is_ativa: true,
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            await axios.post('http://localhost:5000/empresas', formData, { headers });
            setMessage('Empresa cadastrada com sucesso! Redirecionando...');
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao cadastrar empresa.');
        }
    };

    return (
        <div className="form-container" style={{ margin: '20px auto', maxWidth: '600px' }}>
            <Link to="/dashboard" className="back-link">← Voltar para o Dashboard</Link>
            <h2>Cadastrar Nova Empresa</h2>
            <form onSubmit={handleSubmit}>
                <label>CNPJ:</label>
                <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="XX.XXX.XXX/XXXX-XX" required />
                <label>Razão Social:</label>
                <input type="text" name="razao_social" value={formData.razao_social} onChange={handleChange} required />
                <label>Nome Fantasia:</label>
                <input type="text" name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} />
                <label>Data de Abertura:</label>
                <input type="date" name="data_abertura" value={formData.data_abertura} onChange={handleChange} />
                <label>Natureza Jurídica:</label>
                <input type="text" name="natureza_juridica" value={formData.natureza_juridica} onChange={handleChange} />
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <input type="checkbox" name="is_ativa" checked={formData.is_ativa} onChange={handleChange} id="is_ativa" style={{ width: 'auto' }} />
                    <label htmlFor="is_ativa" style={{ marginBottom: 0, marginLeft: '10px' }}>Ativa</label>
                </div>
                <button type="submit">Cadastrar Empresa</button>
            </form>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default CadastroEmpresa;