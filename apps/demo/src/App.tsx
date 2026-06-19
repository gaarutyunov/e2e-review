import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { ResetPasswordPage } from '@/pages/ResetPassword';
import { RegisterPage } from '@/pages/Register';

export function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
      <header className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight">Acme</h1>
      </header>
      <main className="w-full flex justify-center">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}
