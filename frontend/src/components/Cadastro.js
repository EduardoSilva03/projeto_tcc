import React, { useState } from 'react';
import axios from 'axios';

function Cadastro() {
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
      const response = await axios.post('http://localhost:5000/cadastro', formData);
      setMensagem(response.data.message);
      setFormData({ nome: '', sobrenome: '', email: '', senha: '' }); // Limpa o formulário
    } catch (error) {
      setErro(error.response?.data?.error || 'Ocorreu um erro ao cadastrar.');
    }
  };

  return (
    <div className="form-container">
      <h2>Cadastro de Usuário</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome" required />
        <input type="text" name="sobrenome" value={formData.sobrenome} onChange={handleChange} placeholder="Sobrenome" required />
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-mail" required />
        <input type="password" name="senha" value={formData.senha} onChange={handleChange} placeholder="Senha" required />
        <button type="submit">Cadastrar</button>
      </form>
      {mensagem && <p className="success-message">{mensagem}</p>}
      {erro && <p className="error-message">{erro}</p>}
    </div>
  );
}

export default Cadastro;