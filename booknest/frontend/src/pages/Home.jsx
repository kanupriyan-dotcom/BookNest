import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, BookmarkCheck, Camera, Sparkles, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import BookCard from '../components/BookCard';
import CameraModal from '../components/CameraModal';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Camera image update for staff
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTargetBook, setCameraTargetBook] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === 'librarian' || user?.role === 'admin';

  const fetchData = async () => {
    try {
      const [booksRes, catsRes] = await Promise.all([
        api.get('/books?limit=6&sortBy=year_desc'),
        api.get('/categories'),
      ]);
      setFeaturedBooks(booksRes.data.books || []);
      setCategories(catsRes.data || []);
    } catch (err) {
      console.error('Failed to load home data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/books?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/books');
    }
  };

  const handleEditBookImage = (book) => {
    setCameraTargetBook(book);
    setCameraModalOpen(true);
  };

  const handleSaveBookImage = async (dataUrl) => {
    if (!cameraTargetBook) return;
    try {
      await api.put(`/books/${cameraTargetBook._id}/image`, { coverImage: dataUrl });
      fetchData();
    } catch (err) {
      console.error('Failed to update book image:', err);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Minimal Hero */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-14 text-center space-y-6 shadow-2xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Library System & AI Book Inspection</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight max-w-2xl mx-auto">
          Explore Books, Track Loans, and Discover Recommendations
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Search the collection, check real-time availability, borrow titles, and inspect book condition with camera AI.
        </p>

        {/* Minimal Search Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-sky-500 focus-within:bg-white transition-colors">
          <div className="pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, author, or ISBN..."
            className="flex-1 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs focus:outline-hidden bg-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1"
          >
            <span>Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Categories Chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat._id}
                onClick={() => navigate(`/books?category=${encodeURIComponent(cat._id)}`)}
                className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 border border-slate-200/60 transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Feature Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl w-fit">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Full Catalog</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Live availability count, shelf coordinates, ISBN lookups, and one-click holds.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
            <Camera className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Camera Damage Assessment</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Capture before & after photos of books using your camera. AI vision inspection evaluates wear and calculates damage fees.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">AI Book Advisor</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Chatbot helps librarians recommend similar books to customers based on themes, authors, and genres.
          </p>
        </div>
      </section>

      {/* Recent Acquisitions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Additions</h2>
            <p className="text-xs text-slate-500">Latest titles added to our collection</p>
          </div>
          <Link
            to="/books"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 bg-slate-200 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredBooks.map((book) => (
              <BookCard
                key={book._id}
                book={book}
                onEditImage={isStaff ? handleEditBookImage : null}
              />
            ))}
          </div>
        )}
      </section>

      {/* Camera Modal for staff photo updates */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleSaveBookImage}
        title={cameraTargetBook ? `Update Cover: ${cameraTargetBook.title}` : 'Update Book Photo'}
        description="Position book cover to capture photo."
      />
    </div>
  );
}
