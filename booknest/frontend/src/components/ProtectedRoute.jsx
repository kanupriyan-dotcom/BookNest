import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-red-200 rounded-xl shadow-sm text-center">
        <h3 className="text-lg font-bold text-red-700">Access Restricted</h3>
        <p className="mt-2 text-sm text-slate-600">
          This portal requires <strong>{allowedRoles.join(' or ')}</strong> privileges. Your account role is <strong>{user.role}</strong>.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
}
