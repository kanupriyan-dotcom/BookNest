import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AIChatDrawer from './components/AIChatDrawer';
import { Sparkles } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import BookDetail from './pages/BookDetail';
import MyLoans from './pages/MyLoans';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  const [aiChatOpen, setAiChatOpen] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
          <Navbar onToggleAiChat={() => setAiChatOpen(!aiChatOpen)} />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/books" element={<Catalog />} />
              <Route path="/books/:id" element={<BookDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Member Protected Routes */}
              <Route
                path="/my-loans"
                element={
                  <ProtectedRoute>
                    <MyLoans />
                  </ProtectedRoute>
                }
              />

              {/* Staff Protected Routes (Librarian & Admin) */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />

          {/* Floating AI Book Advisor Launcher */}
          <button
            onClick={() => setAiChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl border border-slate-700/60 flex items-center gap-2 text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Ask BookNest AI for book recommendations & similar titles"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>AI Book Advisor</span>
          </button>

          {/* AI Similar Books Drawer */}
          <AIChatDrawer isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
        </div>
      </Router>
    </AuthProvider>
  );
}