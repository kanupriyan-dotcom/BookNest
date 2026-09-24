import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, BookPlus, RefreshCw, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import api from '../api/axios';
import BookCard from '../components/BookCard';
import Modal from '../components/Modal';
import CameraModal from '../components/CameraModal';
import { useAuth } from '../context/AuthContext';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isStaff = user?.role === 'librarian' || user?.role === 'admin';

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);

  // Filter States
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [localSearch, setLocalSearch] = useState(search);
  const [notification, setNotification] = useState(null);

  // Quick Issue Modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [issueDays, setIssueDays] = useState(14);
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Add Book Modal state
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    isbn: '',
    authors: '',
    category: '',
    publisher: '',
    publicationYear: new Date().getFullYear(),
    totalCopies: 3,
    shelfLocation: '',
    description: '',
  });
  const [addBookSubmitting, setAddBookSubmitting] = useState(false);

  // Camera image change state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTargetBook, setCameraTargetBook] = useState(null);

  const handleEditBookImage = (book) => {
    setCameraTargetBook(book);
    setCameraModalOpen(true);
  };

  const handleSaveBookImage = async (dataUrl) => {
    if (!cameraTargetBook) return;
    try {
      await api.put(`/books/${cameraTargetBook._id}/image`, { coverImage: dataUrl });
      showNotification(`Cover photo for "${cameraTargetBook.title}" updated.`);
      fetchBooks();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update book photo.', true);
    }
  };

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Members if staff
  useEffect(() => {
    if (isStaff) {
      const fetchMembers = async () => {
        try {
          const { data } = await api.get('/users?role=member');
          setMembers(data);
        } catch (err) {
          console.error('Error fetching members:', err);
        }
      };
      fetchMembers();
    }
  }, [isStaff]);

  // Fetch Books
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (sortBy) params.append('sortBy', sortBy);
      params.append('page', page.toString());
      params.append('limit', '9');

      const { data } = await api.get(`/books?${params.toString()}`);
      setBooks(data.books || []);
      setTotalPages(data.totalPages || 1);
      setTotalBooks(data.totalBooks || 0);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [search, category, status, sortBy, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1'); // reset to page 1
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', localSearch.trim());
  };

  const handleClearFilters = () => {
    setLocalSearch('');
    setSearchParams({});
  };

  const showNotification = (msg, isError = false) => {
    setNotification({ message: msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  // Member Reserve Handler
  const handleReserveBook = async (book) => {
    if (!user) {
      showNotification('Please log in to reserve a book.', true);
      return;
    }
    try {
      const { data } = await api.post('/borrow/reserve', { bookId: book._id });
      showNotification(data.message || `Book "${book.title}" successfully reserved!`);
      fetchBooks();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to reserve book.', true);
    }
  };

  // Quick Issue Handlers
  const openQuickIssue = (book) => {
    setSelectedBookForIssue(book);
    setSelectedMemberId(members[0]?._id || '');
    setIssueDays(14);
    setIssueModalOpen(true);
  };

  const handleConfirmIssue = async (e) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedBookForIssue) return;
    setIssueSubmitting(true);
    try {
      await api.post('/borrow/issue', {
        bookId: selectedBookForIssue._id,
        userId: selectedMemberId,
        daysToDue: Number(issueDays),
      });
      showNotification(`Book "${selectedBookForIssue.title}" issued successfully!`);
      setIssueModalOpen(false);
      fetchBooks();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to issue book.', true);
    } finally {
      setIssueSubmitting(false);
    }
  };

  // Add Book Handlers
  const handleCreateBook = async (e) => {
    e.preventDefault();
    setAddBookSubmitting(true);
    try {
      const authorsArray = newBook.authors.split(',').map((a) => a.trim()).filter(Boolean);
      await api.post('/books', {
        ...newBook,
        authors: authorsArray,
        categories: newBook.category ? [newBook.category] : [],
        totalCopies: Number(newBook.totalCopies),
        publicationYear: Number(newBook.publicationYear),
      });
      showNotification(`Book "${newBook.title}" added to catalog!`);
      setAddBookModalOpen(false);
      setNewBook({
        title: '',
        isbn: '',
        authors: '',
        category: '',
        publisher: '',
        publicationYear: new Date().getFullYear(),
        totalCopies: 3,
        shelfLocation: '',
        description: '',
      });
      fetchBooks();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create book.', true);
    } finally {
      setAddBookSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-5 duration-200 ${
            notification.isError
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {notification.isError ? (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Catalog Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Library Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, search, and check real-time availability across our stacks
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setAddBookModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors shrink-0"
          >
            <BookPlus className="w-4 h-4" />
            <span>Add New Book</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Search input + Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by title, author, or ISBN..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch('');
                    updateParam('search', '');
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Search
            </button>
          </form>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => updateParam('sortBy', e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Default (Recent)</option>
              <option value="title_asc">Title (A - Z)</option>
              <option value="title_desc">Title (Z - A)</option>
              <option value="year_desc">Year (Newest First)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            <button
              onClick={() => updateParam('category', '')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                !category
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => updateParam('category', c._id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  category === c._id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => updateParam('status', '')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                !status ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => updateParam('status', 'available')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                status === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => updateParam('status', 'unavailable')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                status === 'unavailable'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Reserved
            </button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(search || category || status || sortBy) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div>
              <span>Found <strong>{totalBooks}</strong> matching books</span>
              {search && <span> for &ldquo;{search}&rdquo;</span>}
            </div>
            <button
              onClick={handleClearFilters}
              className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 bg-slate-200 rounded-xl" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <p className="text-slate-400 text-5xl">📚</p>
          <h3 className="text-lg font-bold text-slate-800">No books found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn't find any books matching your search criteria. Try modifying your keywords or filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-lg text-xs font-semibold hover:bg-brand-100 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard
              key={book._id}
              book={book}
              onReserve={handleReserveBook}
              onQuickIssue={openQuickIssue}
              onEditImage={handleEditBookImage}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => updateParam('page', (page - 1).toString())}
            disabled={page <= 1}
            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => updateParam('page', (page + 1).toString())}
            disabled={page >= totalPages}
            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Issue Modal (Staff) */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title={`Issue Book: ${selectedBookForIssue?.title || ''}`}
      >
        <form onSubmit={handleConfirmIssue} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Member
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.email}) - {m.membershipStatus} [Loans: {m.activeLoans}/{m.maxBorrowLimit}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Loan Duration (Days)
            </label>
            <select
              value={issueDays}
              onChange={(e) => setIssueDays(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value={7}>7 Days (1 Week)</option>
              <option value={14}>14 Days (Standard 2 Weeks)</option>
              <option value={21}>21 Days (3 Weeks)</option>
              <option value={30}>30 Days (1 Month)</option>
            </select>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p><strong>Stack Shelf:</strong> {selectedBookForIssue?.shelfLocation || 'Main Hall'}</p>
            <p><strong>Copies Available:</strong> {selectedBookForIssue?.availableCopies} of {selectedBookForIssue?.totalCopies}</p>
            <p className="text-[11px] text-slate-500">Fine policy: ₹5.00/day assessed automatically on overdue returns.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIssueModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={issueSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {issueSubmitting ? 'Issuing...' : 'Confirm Loan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add New Book Modal (Staff) */}
      <Modal
        isOpen={addBookModalOpen}
        onClose={() => setAddBookModalOpen(false)}
        title="Add New Book to Catalog"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateBook} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title *</label>
              <input
                type="text"
                required
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                placeholder="e.g. Clean Architecture"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ISBN *</label>
              <input
                type="text"
                required
                value={newBook.isbn}
                onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                placeholder="e.g. 9780134494166"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Authors (comma-separated) *</label>
              <input
                type="text"
                required
                value={newBook.authors}
                onChange={(e) => setNewBook({ ...newBook, authors: e.target.value })}
                placeholder="e.g. Robert C. Martin"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={newBook.category}
                onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
              <input
                type="text"
                value={newBook.shelfLocation}
                onChange={(e) => setNewBook({ ...newBook, shelfLocation: e.target.value })}
                placeholder="e.g. Stack CS-201"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Publisher</label>
              <input
                type="text"
                value={newBook.publisher}
                onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                placeholder="e.g. Prentice Hall"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Publication Year</label>
              <input
                type="number"
                value={newBook.publicationYear}
                onChange={(e) => setNewBook({ ...newBook, publicationYear: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Copies *</label>
              <input
                type="number"
                min="1"
                required
                value={newBook.totalCopies}
                onChange={(e) => setNewBook({ ...newBook, totalCopies: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Summary</label>
            <textarea
              rows="3"
              value={newBook.description}
              onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
              placeholder="Synopsis, subject overview, or edition remarks..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddBookModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addBookSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {addBookSubmitting ? 'Creating...' : 'Save Book to Catalog'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleSaveBookImage}
        title={cameraTargetBook ? `Update Cover: ${cameraTargetBook.title}` : 'Update Book Photo'}
        description="Position the book cover within the frame to update the catalog image."
      />
    </div>
  );
}
