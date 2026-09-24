import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Send,
  RotateCcw,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Camera,
  Sparkles,
  Shield,
  Bookmark,
  Check,
  Cpu,
  Key,
  Zap,
  QrCode,
} from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import CameraModal from '../components/CameraModal';
import DamageInspectorModal from '../components/DamageInspectorModal';
import CustomerCardModal from '../components/CustomerCardModal';
import QuickCheckOutModal from '../components/QuickCheckOutModal';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Core Data
  const [metrics, setMetrics] = useState(null);
  const [borrowings, setBorrowings] = useState([]);
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);

  // Search & Filters
  const [borrowSearch, setBorrowSearch] = useState('');
  const [borrowFilter, setBorrowFilter] = useState('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Issue & Return form
  const [issueBookId, setIssueBookId] = useState('');
  const [issueUserId, setIssueUserId] = useState('');
  const [issueDays, setIssueDays] = useState(14);
  const [issueBeforePhoto, setIssueBeforePhoto] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Modals & Camera states
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
    coverImage: '',
    replacementCost: 500,
  });

  const [editBookModalOpen, setEditBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  // Camera & Damage Inspector
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraContext, setCameraContext] = useState(null); // { type: 'book_cover' | 'issue_before', bookId: ... }
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedBorrowingForInspection, setSelectedBorrowingForInspection] = useState(null);

  // Quick Check Out & Member QR Pass states
  const [quickCheckOutOpen, setQuickCheckOutOpen] = useState(false);
  const [memberCardModalOpen, setMemberCardModalOpen] = useState(false);
  const [selectedMemberForCard, setSelectedMemberForCard] = useState(null);

  // AI config state
  const [hfApiKey, setHfApiKey] = useState('');
  const [savingAiKey, setSavingAiKey] = useState(false);
  const [scanningOverdue, setScanningOverdue] = useState(false);

  const showNotification = (msg, isError = false) => {
    setNotification({ message: msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, borrowingsRes, booksRes, catsRes, membersRes, resRes, aiRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/borrow/all'),
        api.get('/books?limit=150'),
        api.get('/categories'),
        api.get('/users'),
        api.get('/borrow/reservations'),
        api.get('/ai/status'),
      ]);

      setMetrics(metricsRes.data);
      setBorrowings(borrowingsRes.data || []);
      setBooks(booksRes.data.books || []);
      setCategories(catsRes.data || []);
      setMembers(membersRes.data || []);
      setReservations(resRes.data || []);
      setAiStatus(aiRes.data || null);

      if (booksRes.data.books?.length > 0 && !issueBookId) {
        setIssueBookId(booksRes.data.books[0]._id);
      }
      const memberList = membersRes.data?.filter((m) => m.role === 'member') || [];
      if (memberList.length > 0 && !issueUserId) {
        setIssueUserId(memberList[0]._id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Run Overdue Scan
  const handleRunOverdueScan = async () => {
    setScanningOverdue(true);
    try {
      const { data } = await api.post('/borrow/scan-overdue');
      showNotification(`Scan complete: ${data.currentOverdueLoans} overdue loans updated.`);
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Overdue scan failed.', true);
    } finally {
      setScanningOverdue(false);
    }
  };

  // Issue Book Submit (with optional camera before-photo)
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueBookId || !issueUserId) return;
    setIssueSubmitting(true);
    try {
      await api.post('/borrow/issue', {
        bookId: issueBookId,
        userId: issueUserId,
        daysToDue: Number(issueDays),
        beforeImage: issueBeforePhoto,
      });
      showNotification('Book issued successfully.');
      setIssueBeforePhoto('');
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to issue book.', true);
    } finally {
      setIssueSubmitting(false);
    }
  };

  // Return Book
  const handleReturnBook = async (borrowingId) => {
    try {
      const { data } = await api.post(`/borrow/return/${borrowingId}`);
      showNotification(data.message || 'Book returned successfully.');
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to return book.', true);
    }
  };

  // Pay or Waive Fine
  const handleFineAction = async (borrowingId, action) => {
    try {
      const { data } = await api.post(`/borrow/pay-fine/${borrowingId}`, { action });
      showNotification(data.message);
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Action failed.', true);
    }
  };

  // Add Book
  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const authorsArr = newBook.authors.split(',').map((a) => a.trim()).filter(Boolean);
      await api.post('/books', {
        ...newBook,
        authors: authorsArr,
        categories: newBook.category ? [newBook.category] : [],
        totalCopies: Number(newBook.totalCopies),
        publicationYear: Number(newBook.publicationYear),
        replacementCost: Number(newBook.replacementCost || 25),
      });
      showNotification(`Book "${newBook.title}" added to catalog.`);
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
        coverImage: '',
        replacementCost: 25,
      });
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to add book.', true);
    }
  };

  // Edit Book
  const handleEditBookSubmit = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    try {
      const authorsArr = Array.isArray(editingBook.authors)
        ? editingBook.authors
        : editingBook.authors.split(',').map((a) => a.trim()).filter(Boolean);

      await api.put(`/books/${editingBook._id}`, {
        ...editingBook,
        authors: authorsArr,
        totalCopies: Number(editingBook.totalCopies),
        availableCopies: Number(editingBook.availableCopies),
        publicationYear: Number(editingBook.publicationYear),
      });
      showNotification('Book updated successfully.');
      setEditBookModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update book.', true);
    }
  };

  // Delete Book
  const handleDeleteBook = async (bookId, title) => {
    if (!window.confirm(`Delete "${title}" permanently?`)) return;
    try {
      await api.delete(`/books/${bookId}`);
      showNotification(`Book "${title}" deleted.`);
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete book.', true);
    }
  };

  // Update Member Status
  const handleUpdateMemberStatus = async (memberId, nextStatus) => {
    try {
      await api.put(`/users/${memberId}`, { membershipStatus: nextStatus });
      showNotification(`Member status updated to ${nextStatus}.`);
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update member.', true);
    }
  };

  // Update Max Borrow Limit
  const handleUpdateBorrowLimit = async (memberId, currentLimit) => {
    const newLimit = window.prompt('Enter new maximum borrow limit (1-20):', currentLimit);
    if (!newLimit || isNaN(newLimit)) return;
    try {
      await api.put(`/users/${memberId}`, { maxBorrowLimit: Number(newLimit) });
      showNotification(`Borrow limit updated to ${newLimit}.`);
      fetchDashboardData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update limit.', true);
    }
  };

  // Save Hugging Face API key
  const handleSaveAiConfig = async (e) => {
    e.preventDefault();
    setSavingAiKey(true);
    try {
      await api.post('/ai/config', { apiKey: hfApiKey });
      showNotification('AI service configuration updated.');
      const res = await api.get('/ai/status');
      setAiStatus(res.data);
      setHfApiKey('');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update AI key.', true);
    } finally {
      setSavingAiKey(false);
    }
  };

  // Handle Photo Capture from CameraModal
  const handleCapturedPhoto = async (dataUrl) => {
    if (!cameraContext) return;

    if (cameraContext.type === 'book_cover' && cameraContext.bookId) {
      // Update book cover image in MongoDB
      try {
        await api.put(`/books/${cameraContext.bookId}/image`, { coverImage: dataUrl });
        showNotification('Book cover photo updated.');
        fetchDashboardData();
      } catch (err) {
        showNotification('Failed to update book image.', true);
      }
    } else if (cameraContext.type === 'new_book_cover') {
      setNewBook((prev) => ({ ...prev, coverImage: dataUrl }));
      showNotification('Photo attached to new book.');
    } else if (cameraContext.type === 'issue_before') {
      setIssueBeforePhoto(dataUrl);
      showNotification('Pre-loan baseline photo captured.');
    }
  };

  // Open Camera for specific context
  const triggerCamera = (type, bookId = null) => {
    setCameraContext({ type, bookId });
    setCameraModalOpen(true);
  };

  // Open Damage Inspector for a loan
  const openDamageInspectorFor = (borrowing) => {
    setSelectedBorrowingForInspection(borrowing);
    setInspectorOpen(true);
  };

  if (loading) {
    return (
      <div className="py-24 text-center animate-pulse space-y-4">
        <div className="h-8 w-60 bg-slate-200 rounded-lg mx-auto" />
        <div className="h-4 w-80 bg-slate-200 rounded-lg mx-auto" />
      </div>
    );
  }

  // Filtered queries
  const filteredBorrowings = borrowings.filter((b) => {
    const matchesFilter = borrowFilter === 'all' || b.status === borrowFilter;
    const term = borrowSearch.toLowerCase();
    const matchesSearch =
      !term ||
      b.book?.title?.toLowerCase().includes(term) ||
      b.book?.isbn?.toLowerCase().includes(term) ||
      b.user?.name?.toLowerCase().includes(term) ||
      b.user?.email?.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const filteredBooks = books.filter((b) => {
    const term = inventorySearch.toLowerCase();
    return (
      !term ||
      b.title?.toLowerCase().includes(term) ||
      b.isbn?.toLowerCase().includes(term) ||
      (Array.isArray(b.authors) && b.authors.join(' ').toLowerCase().includes(term))
    );
  });

  const filteredMembers = members.filter((m) => {
    const term = memberSearch.toLowerCase();
    return (
      !term ||
      m.name?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.role?.toLowerCase().includes(term)
    );
  });

  const activeLoansList = borrowings.filter((b) => b.status === 'borrowed' || b.status === 'overdue');

  return (
    <div className="space-y-6 pb-16">
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
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Library Dashboard</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage circulation, catalog inventory, members, and AI book damage inspection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickCheckOutOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Instant QR Card Scanner & Quick Loan Desk"
          >
            <Zap className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
            <span>Quick Check Out</span>
          </button>

          <button
            onClick={handleRunOverdueScan}
            disabled={scanningOverdue}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Scan active loans for overdue status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanningOverdue ? 'animate-spin' : ''}`} />
            <span>{scanningOverdue ? 'Scanning...' : 'Scan Overdue'}</span>
          </button>

          <button
            onClick={() => setAddBookModalOpen(true)}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Book</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'check_in_out', label: 'Check In / Out', icon: RotateCcw },
            { id: 'loans', label: 'Loans', icon: Clock },
            { id: 'books', label: 'Books', icon: BookOpen },
            { id: 'damage_inspection', label: 'Damage Inspection', icon: Camera },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'holds', label: 'Holds', icon: Bookmark },
            { id: 'ai_config', label: 'AI Settings', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'border-sky-600 text-sky-600 font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Minimal KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Catalog Books</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.summary?.totalBooks || 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Total titles</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Active Loans</span>
              <p className="text-2xl font-bold text-sky-600 mt-1">{metrics?.summary?.activeBorrows || 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Books in circulation</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Overdue</span>
              <p className={`text-2xl font-bold mt-1 ${metrics?.summary?.overdueLoans > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {metrics?.summary?.overdueLoans || 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Subject to late fines</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Accrued Fines & Fees</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                ₹{(metrics?.summary?.totalFinesAccumulated || 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Late fines & damage fees</p>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-800 text-sm">AI Book Damage Station</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Take before and after photos of physical books using the device camera. The AI Vision inspection computes damages, creases, stains, and calculates damage fees.
              </p>
              <button
                onClick={() => setActiveTab('damage_inspection')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Launch Damage Inspector</span>
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Rapid Check In / Out</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Instantly check out books to active members with camera baseline inspection, or accept returns and process automated fine calculations.
              </p>
              <button
                onClick={() => setActiveTab('check_in_out')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Go to Check Desk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Check In / Out */}
      {activeTab === 'check_in_out' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quick Check Out Hero Banner */}
          <div className="lg:col-span-12 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-slate-700">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-400/30 shadow-inner">
                <Zap className="w-6 h-6 fill-sky-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>Quick Check Out Station (QR Desk)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold uppercase tracking-wider">
                    Fast Lane
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Scan the customer's QR card with the camera to instantly load their profile & check out books.
                </p>
              </div>
            </div>

            <button
              onClick={() => setQuickCheckOutOpen(true)}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch Quick QR Check Out</span>
            </button>
          </div>

          {/* Issue Section */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-600" />
                <span>Issue Book (Check Out)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Assign a book to an active library patron</p>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Book</label>
                <select
                  value={issueBookId}
                  onChange={(e) => setIssueBookId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 bg-white"
                >
                  {books.map((b) => (
                    <option key={b._id} value={b._id} disabled={b.availableCopies < 1}>
                      {b.title} ({b.availableCopies > 0 ? `${b.availableCopies} available` : 'Out of stock'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Member</label>
                <select
                  value={issueUserId}
                  onChange={(e) => setIssueUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 bg-white"
                >
                  {members
                    .filter((m) => m.role === 'member')
                    .map((m) => (
                      <option key={m._id} value={m._id} disabled={m.membershipStatus !== 'active'}>
                        {m.name} ({m.email}) - {m.membershipStatus}
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

              {/* Pre-loan Camera Photo */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-sky-600" />
                    <span>Baseline Condition Photo</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerCamera('issue_before')}
                    className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
                  >
                    {issueBeforePhoto ? 'Retake Photo' : 'Take Camera Photo'}
                  </button>
                </div>
                {issueBeforePhoto && (
                  <div className="flex items-center gap-3">
                    <img
                      src={issueBeforePhoto}
                      alt="Baseline"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Baseline image attached
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={issueSubmitting}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{issueSubmitting ? 'Issuing...' : 'Issue Book'}</span>
              </button>
            </form>
          </div>

          {/* Active Loans Quick Return */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                  <span>Return Desk</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Active books out on loan ({activeLoansList.length})</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {activeLoansList.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No active loans currently checked out.</p>
              ) : (
                activeLoansList.map((loan) => (
                  <div key={loan._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs truncate">{loan.book?.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Borrower: {loan.user?.name} ({loan.user?.email})
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span className="text-slate-400">
                          Due: {new Date(loan.dueDate).toLocaleDateString()}
                        </span>
                        {loan.status === 'overdue' && (
                          <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            OVERDUE (₹{loan.fineAmount?.toFixed(2)} fine)
                          </span>
                        )}
                        {loan.damageFee > 0 && (
                          <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                            Damage Fee: ₹{loan.damageFee?.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openDamageInspectorFor(loan)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Inspect condition with camera and assess damage fee"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-600" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => handleReturnBook(loan._id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                      >
                        Return
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Loans & Circulation */}
      {activeTab === 'loans' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search loans..."
                  value={borrowSearch}
                  onChange={(e) => setBorrowSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <select
                value={borrowFilter}
                onChange={(e) => setBorrowFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="borrowed">Active</option>
                <option value="overdue">Overdue</option>
                <option value="returned">Returned</option>
              </select>
            </div>

            <span className="text-xs text-slate-400">
              Showing {filteredBorrowings.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Book</th>
                  <th className="py-2.5 px-3">Borrower</th>
                  <th className="py-2.5 px-3">Dates</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Damage Fee</th>
                  <th className="py-2.5 px-3">Late Fine</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBorrowings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 max-w-[200px] truncate">
                      {b.book?.title}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {b.user?.name}
                      <span className="block text-[10px] text-slate-400">{b.user?.email}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      <div>Issued: {new Date(b.issueDate).toLocaleDateString()}</div>
                      <div>Due: {new Date(b.dueDate).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          b.status === 'borrowed'
                            ? 'bg-sky-50 text-sky-700'
                            : b.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      ₹{(b.damageFee || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      ₹{(b.fineAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openDamageInspectorFor(b)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Camera Damage Inspection"
                      >
                        <Camera className="w-4 h-4" />
                      </button>

                      {b.status !== 'returned' && (
                        <button
                          onClick={() => handleReturnBook(b._id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Return
                        </button>
                      )}

                      {b.fineStatus === 'unpaid' && (
                        <button
                          onClick={() => handleFineAction(b._id, 'paid')}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Clear Fees
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Books Catalog */}
      {activeTab === 'books' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search books by title, author, ISBN..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <button
              onClick={() => setAddBookModalOpen(true)}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Book</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Cover</th>
                  <th className="py-2.5 px-3">Title & Author</th>
                  <th className="py-2.5 px-3">ISBN</th>
                  <th className="py-2.5 px-3">Shelf</th>
                  <th className="py-2.5 px-3">Stock</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map((book) => (
                  <tr key={book._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="relative group w-10 h-14 bg-slate-100 rounded-md overflow-hidden border border-slate-200 flex items-center justify-center">
                        {book.coverImage ? (
                          <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-slate-400" />
                        )}
                        <button
                          onClick={() => triggerCamera('book_cover', book._id)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 text-white flex items-center justify-center transition-opacity"
                          title="Change photo with camera"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{book.title}</div>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{book.isbn}</td>
                    <td className="py-2.5 px-3 text-slate-600">{book.shelfLocation || 'Main Hall'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[11px] font-bold ${
                          book.availableCopies > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {book.availableCopies} / {book.totalCopies}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        onClick={() => triggerCamera('book_cover', book._id)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Change Cover Photo (Camera)"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingBook(book);
                          setEditBookModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit book"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(book._id, book.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete book"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Dedicated Damage Inspection Station */}
      {activeTab === 'damage_inspection' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Book Damage Inspection Station</h3>
                <p className="text-xs text-slate-500">
                  Access device camera to record before/after book condition, analyze structural damage, and assess fees.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {borrowings
              .filter((b) => b.status === 'borrowed' || b.status === 'overdue')
              .map((loan) => (
                <div
                  key={loan._id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 transition-all space-y-3 bg-slate-50/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{loan.book?.title}</h4>
                      <p className="text-[11px] text-slate-500">Patron: {loan.user?.name}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                      {loan.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span>Due: {new Date(loan.dueDate).toLocaleDateString()}</span>
                    <span className="font-bold text-slate-900">
                      Damage Fee: ₹{(loan.damageFee || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => openDamageInspectorFor(loan)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span>Open Camera Inspector</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 6: Members */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Limit</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{m.name}</td>
                    <td className="py-3 px-3 text-slate-600">{m.email}</td>
                    <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">{m.role}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          m.membershipStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {m.membershipStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{m.maxBorrowLimit || 3} books</td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedMemberForCard(m);
                          setMemberCardModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="View / Print Digital QR Pass"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>QR Pass</span>
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateMemberStatus(m._id, m.membershipStatus === 'active' ? 'suspended' : 'active')
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        {m.membershipStatus === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleUpdateBorrowLimit(m._id, m.maxBorrowLimit || 3)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg transition-colors"
                      >
                        Set Limit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: Holds */}
      {activeTab === 'holds' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Book</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Reserved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{r.book?.title}</td>
                    <td className="py-3 px-3 text-slate-600">{r.user?.name}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: AI Settings */}
      {activeTab === 'ai_config' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 max-w-xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-sm">AI Model & Vision Setup</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure your AI service access token (API key) to enable vision damage detection and chatbot recommendations.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Status:</span>
              <span className="text-emerald-600 font-bold">{aiStatus?.status || 'Active'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Vision Model:</span>
              <span className="font-mono text-slate-500">{aiStatus?.visionModel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Chat Model:</span>
              <span className="font-mono text-slate-500">{aiStatus?.chatModel}</span>
            </div>
          </div>

          <form onSubmit={handleSaveAiConfig} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AI Service Access Token (API Key)
              </label>
              <input
                type="password"
                placeholder="hf_..."
                value={hfApiKey}
                onChange={(e) => setHfApiKey(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Leave blank for built-in inspection or enter custom API key
              </span>
            </div>

            <button
              type="submit"
              disabled={savingAiKey}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              {savingAiKey ? 'Saving...' : 'Save AI Configuration'}
            </button>
          </form>
        </div>
      )}

      {/* Add Book Modal */}
      <Modal isOpen={addBookModalOpen} onClose={() => setAddBookModalOpen(false)} title="Add New Book">
        <form onSubmit={handleAddBook} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title</label>
            <input
              type="text"
              required
              value={newBook.title}
              onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ISBN</label>
              <input
                type="text"
                required
                value={newBook.isbn}
                onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={newBook.category}
                onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 bg-white"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Authors (comma-separated)</label>
              <input
                type="text"
                required
                value={newBook.authors}
                onChange={(e) => setNewBook({ ...newBook, authors: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
              <input
                type="text"
                value={newBook.shelfLocation}
                onChange={(e) => setNewBook({ ...newBook, shelfLocation: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Copies</label>
              <input
                type="number"
                min="1"
                required
                value={newBook.totalCopies}
                onChange={(e) => setNewBook({ ...newBook, totalCopies: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Replacement Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={newBook.replacementCost}
                onChange={(e) => setNewBook({ ...newBook, replacementCost: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          {/* Optional Camera Snap for new book */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-sky-600" />
              <span>Book Cover Photo</span>
            </span>
            <button
              type="button"
              onClick={() => triggerCamera('new_book_cover')}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
            >
              {newBook.coverImage ? 'Retake Photo' : 'Capture / Upload Photo'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={newBook.description}
              onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddBookModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Add Book
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Book Modal */}
      <Modal isOpen={editBookModalOpen} onClose={() => setEditBookModalOpen(false)} title="Edit Book">
        {editingBook && (
          <form onSubmit={handleEditBookSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={editingBook.title}
                onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Available Copies</label>
                <input
                  type="number"
                  min="0"
                  value={editingBook.availableCopies}
                  onChange={(e) => setEditingBook({ ...editingBook, availableCopies: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Copies</label>
                <input
                  type="number"
                  min="1"
                  value={editingBook.totalCopies}
                  onChange={(e) => setEditingBook({ ...editingBook, totalCopies: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
              <input
                type="text"
                value={editingBook.shelfLocation || ''}
                onChange={(e) => setEditingBook({ ...editingBook, shelfLocation: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditBookModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCapturedPhoto}
        title="Capture Photo"
        description="Position the book cover clearly within the camera frame."
      />

      {/* Book Damage Inspector Modal */}
      <DamageInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        borrowing={selectedBorrowingForInspection}
        onDamageAssessed={() => {
          showNotification('Damage assessment complete.');
          fetchDashboardData();
        }}
      />

      {/* Quick Check Out Modal (QR Desk) */}
      <QuickCheckOutModal
        isOpen={quickCheckOutOpen}
        onClose={() => setQuickCheckOutOpen(false)}
        onCheckOutSuccess={() => {
          showNotification('Quick Check Out successful!');
          fetchDashboardData();
        }}
      />

      {/* Member QR Pass Modal */}
      <CustomerCardModal
        isOpen={memberCardModalOpen}
        onClose={() => {
          setMemberCardModalOpen(false);
          setSelectedMemberForCard(null);
        }}
        user={selectedMemberForCard}
      />
    </div>
  );
}
