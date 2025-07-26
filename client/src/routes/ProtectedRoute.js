import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const ProtectedRoute = ({ element }) => {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return null; // Show nothing while checking authentication
  }

  return isAuthenticated ? element : <Navigate to="/login" />;
};

export default ProtectedRoute;