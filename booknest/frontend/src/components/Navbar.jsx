import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, LayoutDashboard, BookmarkCheck, Menu, X, Sparkles, MessageSquare, QrCode, Zap } from 'lucide-react';
import CustomerCardModal from './CustomerCardModal';
import QuickCheckOutModal from './QuickCheckOutModal';

export default function Navbar({ onToggleAiChat }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showQuickCheckOut, setShowQuickCheckOut] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '';
    return location.pathname.startsWith(path);
  };

  const isStaff = user?.role === 'librarian' || user?.role === 'admin';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-sky-600 font-bold text-lg tracking-tight">
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-xl">
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Book<span className="text-slate-900">Nest</span></span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 text-xs font-semibold">
            <Link
              to="/books"
              className={`transition-colors px-2.5 py-1.5 rounded-lg ${
                isActive('/books')
                  ? 'text-sky-600 font-bold bg-sky-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catalog
            </Link>

            {user && (
              <Link
                to="/my-loans"
                className={`flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg ${
                  isActive('/my-loans')
                    ? 'text-sky-600 font-bold bg-sky-50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>My Loans</span>
              </Link>
            )}

            {isStaff && (
              <Link
                to="/admin/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive('/admin/dashboard')
                    ? 'text-sky-700 bg-sky-100 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right side: Quick Check Out + AI Advisor + QR Pass + User profile / actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Quick Check Out for Staff */}
          {isStaff && (
            <button
              onClick={() => setShowQuickCheckOut(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Instant QR Card Scanner & Check Out Desk"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Quick Check Out</span>
            </button>
          )}

          {/* Member Digital Library Pass */}
          {user && (
            <button
              onClick={() => setShowCardModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="View / Print Digital Library Pass"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>My Pass</span>
            </button>
          )}

          {/* AI Advisor Button */}
          {onToggleAiChat && (
            <button
              onClick={onToggleAiChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Open AI Book Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>AI Advisor</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                <span className="text-[10px] font-semibold text-slate-400 capitalize">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl transition-colors shadow-2xs"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {isStaff && (
            <button
              onClick={() => setShowQuickCheckOut(true)}
              className="p-1.5 bg-sky-600 text-white rounded-lg"
              title="Quick Check Out"
            >
              <Zap className="w-4 h-4 fill-white" />
            </button>
          )}
          {user && (
            <button
              onClick={() => setShowCardModal(true)}
              className="p-1.5 text-emerald-700 bg-emerald-50 rounded-lg"
              title="My Pass"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
          {onToggleAiChat && (
            <button
              onClick={onToggleAiChat}
              className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg"
              title="AI Advisor"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2">
          <Link
            to="/books"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-xs font-semibold text-slate-700 hover:text-sky-600"
          >
            Catalog
          </Link>
          {user && (
            <Link
              to="/my-loans"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-xs font-semibold text-slate-700 hover:text-sky-600"
            >
              My Loans
            </Link>
          )}
          {isStaff && (
            <Link
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-xs font-semibold text-sky-600"
            >
              Dashboard
            </Link>
          )}

          {isStaff && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowQuickCheckOut(true);
              }}
              className="w-full text-left py-2 text-xs font-bold text-sky-700 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-sky-600" />
              <span>⚡ Quick Check Out (QR Desk)</span>
            </button>
          )}

          {user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowCardModal(true);
              }}
              className="w-full text-left py-2 text-xs font-bold text-emerald-700 flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>My Member QR Pass</span>
            </button>
          )}

          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{user.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-1.5 text-center text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-1.5 text-center text-xs font-semibold text-white bg-slate-900 rounded-xl"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>

    {/* Customer QR Card Modal */}
    <CustomerCardModal
      isOpen={showCardModal}
      onClose={() => setShowCardModal(false)}
      user={user}
    />

    {/* Quick Check Out Modal */}
    <QuickCheckOutModal
      isOpen={showQuickCheckOut}
      onClose={() => setShowQuickCheckOut(false)}
      onCheckOutSuccess={() => {
        if (location.pathname.includes('/admin/dashboard') || location.pathname.includes('/my-loans')) {
          window.location.reload();
        }
      }}
    />
  </>
  );
}
