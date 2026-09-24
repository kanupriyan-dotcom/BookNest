import React from 'react';
import { Link } from 'react-router-dom';
import { Book as BookIcon, CheckCircle2, AlertCircle, BookmarkPlus, ArrowRight, MapPin, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BookCard({ book, onReserve, onQuickIssue, onEditImage }) {
  const { user } = useAuth();
  const isAvailable = book.availableCopies > 0;
  const isStaff = user?.role === 'librarian' || user?.role === 'admin';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Cover Image / Spine Header */}
      <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-slate-800 to-slate-900 p-4 text-white flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-white/90">
                {book.categories?.[0]?.name || 'General'}
              </span>
            </div>
            <div>
              <BookIcon className="w-7 h-7 text-sky-400/80 mb-2" />
              <p className="text-xs font-mono text-slate-300 truncate">ISBN: {book.isbn}</p>
            </div>
          </div>
        )}

        {/* Status Badge overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs ${
              isAvailable
                ? 'bg-emerald-600/90 text-white'
                : 'bg-rose-600/90 text-white'
            }`}
          >
            {isAvailable ? `${book.availableCopies} Available` : 'Reserved'}
          </span>
        </div>

        {/* Librarian Change Image Button */}
        {isStaff && onEditImage && (
          <button
            onClick={() => onEditImage(book)}
            className="absolute bottom-2.5 right-2.5 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-xs transition-colors shadow-xs"
            title="Change book photo with camera"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Book Info Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <Link to={`/books/${book._id}`}>
            <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1 text-sm">
              {book.title}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
          </p>
          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            {book.description || 'No description provided.'}
          </p>
        </div>

        <div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[120px]">{book.shelfLocation || 'Main Stacks'}</span>
            </div>
            <span>{book.publicationYear || ''}</span>
          </div>

          {/* Quick Buttons */}
          <div className="mt-3 flex items-center gap-2">
            <Link
              to={`/books/${book._id}`}
              className="flex-1 py-1.5 px-3 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              View
            </Link>

            {!isAvailable && user?.role === 'member' && onReserve && (
              <button
                onClick={() => onReserve(book)}
                className="py-1.5 px-3 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Reserve</span>
              </button>
            )}

            {isStaff && isAvailable && onQuickIssue && (
              <button
                onClick={() => onQuickIssue(book)}
                className="py-1.5 px-3 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors"
              >
                Issue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
