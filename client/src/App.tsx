import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import { LoginPage, SignUpPage } from './auth/AuthPages';
import { getAuthSession } from './auth/authStorage';

function RequireAuth({ children }: { children: ReactNode }) {
    return getAuthSession()?.token ? children : <Navigate to="/login" replace />;
}

export default function App() {
    const hasSession = Boolean(getAuthSession()?.token);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route
                    path="/"
                    element={<Navigate to={hasSession ? '/documents' : '/login'} replace />}
                />
                <Route
                    path="/documents"
                    element={
                        <RequireAuth>
                            <Dashboard />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/documents/:docId"
                    element={
                        <RequireAuth>
                            <Editor />
                        </RequireAuth>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
