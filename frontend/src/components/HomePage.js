import React from 'react';
import Login from './Login';
import Cadastro from './Cadastro';

function HomePage() {
    return (
        <div className="container">
            <Login />
            <Cadastro />
        </div>
    );
}

export default HomePage;