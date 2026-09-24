import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Book as BookIcon,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Building,
  Hash,
  BookmarkPlus,
  Edit,
  Trash2,
  Send,
  Camera,
  Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import CameraModal from '../components/CameraModal';
import DamageInspectorModal from '../components/DamageInspectorModal';
import { useAuth } from '../context/AuthContext';

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === 'librarian' || user?.role === 'admin';

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Issue Modal State
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [issueDays, setIssueDays] = useState(14);
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Camera & Damage Inspector Modals
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [damageInspectorOpen, setDamageInspectorOpen] = useState(false);

  const fetchBook = async () => {
    try {
      const { data } = await api.get(`/books/${id}`);
      setBook(data);
      setEditFormData({
        title: data.title,
        isbn: data.isbn,
        authors: Array.isArray(data.authors) ? data.authors.join(', ') : data.authors,
        publisher: data.publisher || '',
        publicationYear: data.publicationYear || '',
        shelfLocation: data.shelfLocation || '',
        totalCopies: data.totalCopies,
        availableCopies: data.availableCopies,
        description: data.description || '',
        coverImage: data.coverImage || '',
      });
    } catch (err) {
      console.error('Failed to load book', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();
  }, [id]);

  useEffect(() => {
    if (isStaff) {
      const fetchMembers = async () => {
        try {
          const { data } = await api.get('/users?role=member');
          setMembers(data);
          if (data.length > 0) setSelectedMemberId(data[0]._id);
        } catch (err) {
          console.error('Failed to load members', err);
        }
      };
      fetchMembers();
    }
  }, [isStaff]);

  const showNotification = (msg, isError = false) => {
    setNotification({ message: msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  // Change Book Image at will by librarian
  const handleUpdateCoverImage = async (dataUrl) => {
    try {
      await api.put(`/books/${book._id}/image`, { coverImage: dataUrl });
      showNotification('Book cover photo updated successfully.');
      fetchBook();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update book image.', true);
    }
  };

  // Member Reserve
  const handleReserve = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post('/borrow/reserve', { bookId: book._id });
      showNotification(data.message || 'Book reserved successfully.');
      fetchBook();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to reserve book.', true);
    }
  };

  // Staff Issue
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    setIssueSubmitting(true);
    try {
      await api.post('/borrow/issue', {
        bookId: book._id,
        userId: selectedMemberId,
        daysToDue: Number(issueDays),
      });
      showNotification('Book issued successfully.');
      setIssueModalOpen(false);
      fetchBook();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to issue book.', true);
    } finally {
      setIssueSubmitting(false);
    }
  };

  // Staff Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const authorsArray = editFormData.authors.split(',').map((a) => a.trim()).filter(Boolean);
      await api.put(`/books/${book._id}`, {
        ...editFormData,
        authors: authorsArray,
        totalCopies: Number(editFormData.totalCopies),
        availableCopies: Number(editFormData.availableCopies),
        publicationYear: Number(editFormData.publicationYear),
      });
      showNotification('Book details updated successfully.');
      setEditModalOpen(false);
      fetchBook();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update book.', true);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Staff Delete
  const handleDeleteBook = async () => {
    if (!window.confirm(`Delete "${book.title}" from catalog?`)) {
      return;
    }
    try {
      await api.delete(`/books/${book._id}`);
      navigate('/books');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete book.', true);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center animate-pulse space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded-lg mx-auto" />
        <div className="h-4 w-40 bg-slate-200 rounded-lg mx-auto" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="py-20 text-center space-y-3">
        <h2 className="text-xl font-bold text-slate-800">Book Not Found</h2>
        <p className="text-sm text-slate-500">The requested book does not exist in the catalog.</p>
        <Link to="/books" className="inline-block mt-4 text-sky-600 font-semibold text-sm">
          ← Back to Catalog
        </Link>
      </div>
    );
  }

  const isAvailable = book.availableCopies > 0;
  const stockPercentage = Math.round((book.availableCopies / (book.totalCopies || 1)) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
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

      {/* Back button & Action controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/books')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </button>

        {isStaff && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDamageInspectorOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Inspect Damage</span>
            </button>
            <button
              onClick={() => setEditModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDeleteBook}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Book Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Cover Image Presentation */}
        <div className="md:col-span-5 bg-slate-100 relative min-h-[320px] flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-100">
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt={book.title}
              className="max-h-[360px] w-auto rounded-xl object-contain shadow-md"
            />
          ) : (
            <div className="w-full h-full max-h-[320px] bg-slate-900 rounded-xl text-white p-6 flex flex-col justify-between shadow-md">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-slate-200">
                  {book.categories?.[0]?.name || 'General'}
                </span>
                <p className="text-base font-bold leading-snug pt-3">{book.title}</p>
                <p className="text-xs text-slate-400">
                  {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
                </p>
              </div>
              <div>
                <BookIcon className="w-8 h-8 text-sky-400 opacity-80 mb-2" />
                <p className="text-[11px] font-mono text-slate-400">ISBN: {book.isbn}</p>
              </div>
            </div>
          )}

          {/* Librarian Camera Change Action */}
          {isStaff && (
            <button
              onClick={() => setCameraModalOpen(true)}
              className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition-colors flex items-center gap-1.5 shadow-md"
              title="Capture with camera or upload new cover photo"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Photo</span>
            </button>
          )}
        </div>

        {/* Book Details */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {book.categories?.map((c) => (
                  <span
                    key={c._id || c}
                    className="text-[10px] font-bold tracking-wider uppercase bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full border border-sky-100"
                  >
                    {c.name || 'Category'}
                  </span>
                ))}
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    isAvailable
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isAvailable ? `${book.availableCopies} Copies Available` : 'All Copies Checked Out'}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{book.title}</h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                by {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
              </p>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Shelf Location</span>
                <span className="font-semibold text-slate-700">{book.shelfLocation || 'Main Hall'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Publication Year</span>
                <span className="font-semibold text-slate-700">{book.publicationYear || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">ISBN</span>
                <span className="font-mono font-semibold text-slate-700">{book.isbn}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Overview</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {book.description || 'No description provided for this catalog entry.'}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
            {isStaff ? (
              <div className="w-full flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {book.availableCopies} of {book.totalCopies} copies in stock
                </span>
                <button
                  onClick={() => setIssueModalOpen(true)}
                  disabled={!isAvailable}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Issue Book</span>
                </button>
              </div>
            ) : isAvailable ? (
              <div className="w-full flex items-center justify-between">
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Available on Shelf {book.shelfLocation || 'Main Stacks'}</span>
                </span>
                <span className="text-xs text-slate-400">Visit library desk to check out</span>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <span className="text-xs text-rose-600 font-medium">Currently checked out</span>
                <button
                  onClick={handleReserve}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Reserve Copy</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Book Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Book">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={editFormData.title || ''}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Authors (comma-separated)</label>
              <input
                type="text"
                required
                value={editFormData.authors || ''}
                onChange={(e) => setEditFormData({ ...editFormData, authors: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
              <input
                type="text"
                value={editFormData.shelfLocation || ''}
                onChange={(e) => setEditFormData({ ...editFormData, shelfLocation: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Available Copies</label>
              <input
                type="number"
                min="0"
                value={editFormData.availableCopies || 0}
                onChange={(e) => setEditFormData({ ...editFormData, availableCopies: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Copies</label>
              <input
                type="number"
                min="1"
                value={editFormData.totalCopies || 1}
                onChange={(e) => setEditFormData({ ...editFormData, totalCopies: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={editFormData.description || ''}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Issue Book Modal */}
      <Modal isOpen={issueModalOpen} onClose={() => setIssueModalOpen(false)} title="Issue Book">
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Member</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 bg-white"
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Period (Days)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={issueDays}
              onChange={(e) => setIssueDays(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIssueModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={issueSubmitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              {issueSubmitting ? 'Issuing...' : 'Confirm Issue'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Camera Capture Modal for Updating Book Cover */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleUpdateCoverImage}
        title="Update Book Cover Photo"
        description="Capture a new photo of this physical book or upload an image."
      />

      {/* Book Damage Inspector Modal */}
      <DamageInspectorModal
        isOpen={damageInspectorOpen}
        onClose={() => setDamageInspectorOpen(false)}
        book={book}
        onDamageAssessed={() => {
          showNotification('Damage assessment complete.');
          fetchBook();
        }}
      />
    </div>
  );
}
