import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { token } = useContext(AuthContext);

    return token ? <Outlet /> : <Navigate to="/" />;
};

export default ProtectedRoute;