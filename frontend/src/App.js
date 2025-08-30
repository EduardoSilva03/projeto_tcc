import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import HomePage from './components/HomePage';
import Dashboard from './components/Dashboard';
import CadastroMobile from './components/CadastroMobile';
import EditUser from './components/EditUser';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/cadastro-mobile" element={<CadastroMobile />} />
                <Route path="/dashboard/user/:userId" element={<EditUser />} />
              </Route>
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;