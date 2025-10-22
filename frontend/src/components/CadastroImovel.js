import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useParams, useNavigate } from 'react-router-dom';

function CadastroImovel() {
    const { token } = useContext(AuthContext);
    const { empresaId } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        nome_residencial: '',
        tipo_imovel: '',
        unidade: '',
        valor: '',
        cep: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        complemento: '',
        link_google_maps: '',
        situacao: 'Na planta',
        data_entrega_prevista: '',
        is_financiamento_liberado: false,
        financiamento_aceito: ''
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
            const response = await axios.post(`http://localhost:5000/empresas/${empresaId}/imoveis`, formData, { headers });
            
            setMessage('Imóvel cadastrado com sucesso! Redirecionando...');
            setTimeout(() => navigate(`/dashboard/imovel/${response.data.id}`), 2000);
            
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao cadastrar imóvel.');
        }
    };

    const formGridStyle = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
    };

    return (
        <div className="form-container" style={{ margin: '20px auto', maxWidth: '900px' }}>
            <Link to={`/dashboard/empresa/${empresaId}`} className="back-link">← Voltar para Empresa</Link>
            <h2>Cadastrar Novo Imóvel</h2>
            <form onSubmit={handleSubmit}>
                <div style={formGridStyle}>
                    <div>
                        <label>Nome do Residencial:</label>
                        <input type="text" name="nome_residencial" value={formData.nome_residencial} onChange={handleChange} required />
                        <label>Tipo (ex: Geminado):</label>
                        <input type="text" name="tipo_imovel" value={formData.tipo_imovel} onChange={handleChange} />
                        <label>Unidade (ex: AP-02):</label>
                        <input type="text" name="unidade" value={formData.unidade} onChange={handleChange} required />
                        <label>Valor (R$):</label>
                        <input type="number" name="valor" value={formData.valor} onChange={handleChange} required />
                        <label>Situação:</label>
                        <select name="situacao" value={formData.situacao} onChange={handleChange}>
                            <option value="Na planta">Na planta</option>
                            <option value="Em construção">Em construção</option>
                            <option value="Pronto para morar">Pronto para morar</option>
                        </select>
                        <label>Data Prev. Entrega:</label>
                        <input type="date" name="data_entrega_prevista" value={formData.data_entrega_prevista} onChange={handleChange} />
                    </div>
                    <div>
                        <label>CEP:</label>
                        <input type="text" name="cep" value={formData.cep} onChange={handleChange} />
                        <label>Rua:</label>
                        <input type="text" name="rua" value={formData.rua} onChange={handleChange} />
                        <label>Número:</label>
                        <input type="text" name="numero" value={formData.numero} onChange={handleChange} />
                        <label>Bairro:</label>
                        <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} />
                        <label>Cidade:</label>
                        <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} />
                        <label>Estado (ex: SC):</label>
                        <input type="text" name="estado" value={formData.estado} onChange={handleChange} maxLength="2" />
                    </div>
                </div>

                <label>Complemento:</label>
                <input type="text" name="complemento" value={formData.complemento} onChange={handleChange} />
                <label>Link Google Maps:</label>
                <input type="text" name="link_google_maps" value={formData.link_google_maps} onChange={handleChange} />
                <label>Financiamento Aceito (ex: Minha Casa Minha Vida):</label>
                <input type="text" name="financiamento_aceito" value={formData.financiamento_aceito} onChange={handleChange} />
                <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
                    <input type="checkbox" name="is_financiamento_liberado" checked={formData.is_financiamento_liberado} onChange={handleChange} id="is_financiamento_liberado" style={{ width: 'auto' }} />
                    <label htmlFor="is_financiamento_liberado" style={{ marginBottom: 0, marginLeft: '10px' }}>Liberado para Financiamento</label>
                </div>
                
                <button type="submit" style={{marginTop: '20px'}}>Salvar Imóvel</button>
            </form>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default CadastroImovel;