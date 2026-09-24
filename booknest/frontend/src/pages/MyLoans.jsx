import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  Bookmark,
  XCircle,
  HelpCircle,
  ArrowRight,
  MapPin,
  IndianRupee,
  Sparkles,
  QrCode,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CustomerCardModal from '../components/CustomerCardModal';

export default function MyLoans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'reservations', 'history'
  const [cancellingId, setCancellingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);

  const fetchMyLoans = async () => {
    try {
      const { data } = await api.get('/borrow/my-loans');
      setLoans(data.loans || []);
      setReservations(data.reservations || []);
    } catch (err) {
      console.error('Failed to load my loans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLoans();
  }, []);

  const showNotification = (msg, isError = false) => {
    setNotification({ message: msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Cancel this book reservation?')) return;
    setCancellingId(reservationId);
    try {
      await api.delete(`/borrow/reserve/${reservationId}`);
      showNotification('Reservation cancelled successfully.');
      fetchMyLoans();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to cancel reservation.', true);
    } finally {
      setCancellingId(null);
    }
  };

  const activeLoans = loans.filter((l) => l.status === 'borrowed' || l.status === 'overdue');
  const pastLoans = loans.filter((l) => l.status === 'returned');
  const overdueLoans = loans.filter((l) => l.status === 'overdue');
  const totalUnpaidFines = loans
    .filter((l) => l.fineStatus === 'unpaid')
    .reduce((sum, l) => sum + (l.fineAmount || 0) + (l.damageFee || 0), 0);

  const calculateDaysRemaining = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="py-20 text-center animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded-lg mx-auto" />
        <div className="h-4 w-72 bg-slate-200 rounded-lg mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Member Portal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your current loans, renewal dates, fine balance, and holds
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCardModal(true)}
            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>My Library QR Pass</span>
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            Card Status: <span className="capitalize text-emerald-600 font-bold">{user?.membershipStatus || 'Active'}</span>
          </span>
          <Link
            to="/books"
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>Borrow Books</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Loans */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Loans</span>
            <BookOpen className="w-5 h-5 text-brand-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{activeLoans.length}</span>
            <span className="text-xs text-slate-500">of {user?.maxBorrowLimit || 3} allowed</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-brand-600 h-full rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (activeLoans.length / (user?.maxBorrowLimit || 3)) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Overdue Loans */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
            <AlertTriangle className={`w-5 h-5 ${overdueLoans.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${overdueLoans.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {overdueLoans.length}
            </span>
            <span className="text-xs text-slate-500">books past due</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {overdueLoans.length > 0 ? 'Please return to prevent further fines' : 'All loans currently on time'}
          </p>
        </div>

        {/* Unpaid Fines */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Unpaid Fines</span>
            <IndianRupee className={`w-5 h-5 ${totalUnpaidFines > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${totalUnpaidFines > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              ₹{totalUnpaidFines.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            ₹5.00 accrued per day late
          </p>
        </div>

        {/* Active Reservations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Reservations</span>
            <Bookmark className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{reservations.length}</span>
            <span className="text-xs text-slate-500">in hold queue</span>
          </div>
          <p className="text-[11px] text-indigo-600 mt-2">
            {reservations.some((r) => r.status === 'ready_for_pickup')
              ? '✨ Book ready for pickup!'
              : 'Waiting for returns'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'active'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Active Loans</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
              {activeLoans.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reservations')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'reservations'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>My Holds & Reservations</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
              {reservations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Reading History</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
              {pastLoans.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Active Loans */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeLoans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <p className="text-4xl">📖</p>
              <h3 className="text-base font-bold text-slate-800">No Active Loans</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven't borrowed any books currently. Explore our catalog and pick up your next read.
              </p>
              <Link
                to="/books"
                className="inline-block mt-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-brand-700 transition-colors"
              >
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLoans.map((loan) => {
                const daysRemaining = calculateDaysRemaining(loan.dueDate);
                const isOverdue = loan.status === 'overdue' || daysRemaining < 0;

                return (
                  <div
                    key={loan._id}
                    className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between transition-all ${
                      isOverdue ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            to={`/books/${loan.book?._id}`}
                            className="font-bold text-slate-900 hover:text-brand-600 transition-colors text-base line-clamp-1"
                          >
                            {loan.book?.title || 'Unknown Title'}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5">
                            by {Array.isArray(loan.book?.authors) ? loan.book?.authors.join(', ') : loan.book?.authors}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                              : daysRemaining <= 3
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : `${daysRemaining} Days Left`}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Issued On</span>
                          <span className="font-medium">
                            {new Date(loan.issueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Due Date</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 text-slate-500 pt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Stack: {loan.book?.shelfLocation || 'Main Hall'}</span>
                        </div>
                      </div>

                      {isOverdue && (
                        <div className="mt-3 bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center justify-between text-xs text-rose-800">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Late Fine:</span>
                          </div>
                          <span className="font-bold text-rose-700 text-sm">
                            ₹{(loan.fineAmount || 0).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {loan.damageFee > 0 && (
                        <div className="mt-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs text-amber-800">
                          <span>Damage Fee (Assessed):</span>
                          <span className="font-bold text-amber-700">₹{loan.damageFee.toFixed(2)}</span>
                        </div>
                      )}

                      {loan.beforeImage && (
                        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <img src={loan.beforeImage} alt="Baseline" className="w-7 h-7 rounded object-cover border border-slate-200" />
                          <span>Pre-loan inspection photo recorded</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>ISBN: {loan.book?.isbn}</span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Return at Circulation Desk
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reservations */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          {reservations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <p className="text-4xl">🔖</p>
              <h3 className="text-base font-bold text-slate-800">No Active Holds</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When you find an out-of-stock book in our catalog, place a hold to reserve the next available copy.
              </p>
              <Link
                to="/books?status=unavailable"
                className="inline-block mt-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-brand-700 transition-colors"
              >
                Browse Reserved Titles
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reservations.map((res) => {
                const isReady = res.status === 'ready_for_pickup';

                return (
                  <div
                    key={res._id}
                    className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between ${
                      isReady ? 'border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            to={`/books/${res.book?._id}`}
                            className="font-bold text-slate-900 hover:text-brand-600 transition-colors text-base line-clamp-1"
                          >
                            {res.book?.title || 'Unknown Title'}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5">
                            by {Array.isArray(res.book?.authors) ? res.book?.authors.join(', ') : res.book?.authors}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                            isReady
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isReady ? (
                            <>
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              Ready for Pickup
                            </>
                          ) : (
                            'In Queue (Pending)'
                          )}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Reserved On:</span>
                          <span className="font-medium">
                            {new Date(res.reservedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {isReady && res.holdExpiresAt && (
                          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 space-y-1">
                            <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              Hold copy waiting at Front Desk!
                            </p>
                            <p className="text-[11px] text-emerald-700">
                              Please claim by: <strong>{new Date(res.holdExpiresAt).toLocaleString()}</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Status: {res.status}</span>
                      <button
                        onClick={() => handleCancelReservation(res._id)}
                        disabled={cancellingId === res._id}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                      >
                        {cancellingId === res._id ? 'Cancelling...' : 'Cancel Hold'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {pastLoans.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No previous borrowing history recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Book Title</th>
                    <th className="py-3.5 px-4">Issue Date</th>
                    <th className="py-3.5 px-4">Returned Date</th>
                    <th className="py-3.5 px-4">Fine Incurred</th>
                    <th className="py-3.5 px-4">Fine Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastLoans.map((loan) => (
                    <tr key={loan._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <Link to={`/books/${loan.book?._id}`} className="hover:text-brand-600">
                          {loan.book?.title || 'Unknown Title'}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(loan.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {loan.returnDate ? new Date(loan.returnDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {loan.fineAmount > 0 ? `₹${loan.fineAmount.toFixed(2)}` : '₹0.00'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            loan.fineStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : loan.fineStatus === 'waived'
                              ? 'bg-slate-100 text-slate-600'
                              : loan.fineStatus === 'unpaid'
                              ? 'bg-rose-100 text-rose-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {loan.fineStatus === 'none' ? 'Clean' : loan.fineStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Digital Library Pass Modal */}
      <CustomerCardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        user={user}
      />
    </div>
  );
}
