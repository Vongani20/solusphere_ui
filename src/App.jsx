import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Admin from "./pages/Admin";
import BPOAnalysis from "./pages/BPOAnalysis";
import Login from "./pages/login";
import Register from "./pages/register";
import Profile from "./pages/profile";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import FileUploads from "./pages/FileUploads";
import UserChat from "./pages/UserChat";
import FaceLogin from "./pages/FaceLogin";
import ForgotPassword from "./pages/ForgotPassword";
import HelpDesk from "./pages/helpdesk";
import Chatbot from "./pages/Chatbot";
import UpdatePassword from "./pages/UpdatePassword";
import CVBuilder from "./pages/CVBuilder";
import AdminRoute from "./components/AdminRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { CallProvider } from "./context/CallContext";

function App() {
  const defaultRoute = localStorage.getItem("token") ? "/dashboard" : "/login";

  return (
    <Router>
      <ErrorBoundary>
        <CallProvider>
        <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/face-login" element={<FaceLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/update-password"
          element={
            <ProtectedRoute>
              <UpdatePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-chat"
          element={
            <ProtectedRoute>
              <UserChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/helpdesk"
          element={
            <ProtectedRoute>
              <HelpDesk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chatbot"
          element={
            <ProtectedRoute>
              <Chatbot />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bpo"
          element={
            <ProtectedRoute>
              <BPOAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/uploads"
          element={
            <ProtectedRoute>
              <FileUploads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cv-builder"
          element={
            <ProtectedRoute>
              <CVBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Admin />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
        </CallProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
