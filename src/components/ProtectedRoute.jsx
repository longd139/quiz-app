import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false, allowPasswordChangeOnly = false }) {
  const { loading, isAuthenticated, isAdmin, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbfa] dark:bg-[#0c0f17]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Đang xác thực phiên làm việc...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce mandatory password change on first login (cannot bypass via URL)
  if (mustChangePassword && !allowPasswordChangeOnly) {
    return <Navigate to="/change-password" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
