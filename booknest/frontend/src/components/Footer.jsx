import React from 'react';
import { BookOpen, Sparkles, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <div className="p-1 bg-sky-500/20 text-sky-400 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Book<span className="text-sky-400">Nest</span></span>
            <span className="text-slate-500 font-normal text-xs ml-2">
              Library System & AI Book Inspection
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-slate-400">
            <Link to="/books" className="hover:text-white transition-colors">Catalog</Link>
            <Link to="/my-loans" className="hover:text-white transition-colors">My Loans</Link>
            <Link to="/admin/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>

          <div className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} BookNest. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
