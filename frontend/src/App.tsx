// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import LoginRegister from "./pages/LoginRegister";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectDetails from "./pages/ProjectDetails";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<LoginRegister />} />

        {/* Protected route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Project details (protected) */}
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
