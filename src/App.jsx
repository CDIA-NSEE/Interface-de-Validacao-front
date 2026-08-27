import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import LoadingState from "./components/LoadingState.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const ExamReviewPage = lazy(() => import("./pages/ExamReviewPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));

function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingState message="Validando sessão..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingState message="Validando sessão..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppErrorBoundary onRetry={() => window.location.reload()}>
            <Suspense fallback={<LoadingState message="Carregando interface..." />}>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/exams/:id"
                  element={
                    <ProtectedRoute>
                      <ExamReviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AppErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
