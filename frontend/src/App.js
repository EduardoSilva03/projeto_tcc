import React from 'react';
import Cadastro from './components/Cadastro';
import Login from './components/Login';
import './App.css';

function App() {
  return (
    <div className="App">
      <header>
        <h1>Sistema de Cadastro e Login</h1>
      </header>
      <main className="container">
        <Cadastro />
        <Login />
      </main>
    </div>
  );
}

export default App;