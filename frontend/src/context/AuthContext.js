import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const navigate = useNavigate();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    const loginAction = (data) => {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        navigate('/dashboard');
    };

    const logOut = () => {
        localStorage.removeItem('token');
        setToken(null);
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ token, loginAction, logOut }}>
            {children}
        </AuthContext.Provider>
    );
};