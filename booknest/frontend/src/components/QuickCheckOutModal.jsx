import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import jsQR from 'jsqr';
import {
  X,
  Zap,
  QrCode,
  Camera,
  Search,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Calendar,
  RefreshCw,
  Check,
} from 'lucide-react';
import api from '../api/axios';

export default function QuickCheckOutModal({ isOpen, onClose, onCheckOutSuccess }) {
  // Step tracker: 1 = Member Scan/Select, 2 = Book Select, 3 = Confirmation
  const [step, setStep] = useState(1);

  // Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Member state
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchingMember, setSearchingMember] = useState(false);

  // Book state
  const [availableBooks, setAvailableBooks] = useState([]);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [daysToDue, setDaysToDue] = useState(14);

  // Baseline inspection photo
  const [baselinePhoto, setBaselinePhoto] = useState('');
  const [takingBaseline, setTakingBaseline] = useState(false);

  // Final submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState(null);

  const handleClose = () => {
    stopCamera();
    setCameraActive(false);
    setError(null);
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Manage Camera Stream & QR Scanning loop
  useEffect(() => {
    if (!isOpen || step !== 1 || !cameraActive) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, step, cameraActive]);

  // Auto-start camera when entering step 1
  useEffect(() => {
    if (isOpen && step === 1 && !selectedMember) {
      setCameraActive(true);
    }
  }, [isOpen, step, selectedMember]);

  // Load books when step 2 is active
  useEffect(() => {
    if (isOpen && step === 2 && availableBooks.length === 0) {
      fetchAvailableBooks();
    }
  }, [isOpen, step]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        scanLoopRef.current = requestAnimationFrame(scanQRCodeFrame);
      }
    } catch (err) {
      console.warn('Camera error for QR scanner:', err);
      setCameraError('Camera access unavailable. You can search or type the member card # below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Continuous frame analysis for QR code
  const scanQRCodeFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      scanLoopRef.current = requestAnimationFrame(scanQRCodeFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      handleQRDetected(code.data);
      return;
    }

    scanLoopRef.current = requestAnimationFrame(scanQRCodeFrame);
  };

  const handleQRDetected = async (qrString) => {
    stopCamera();
    setCameraActive(false);
    await lookupMember(qrString);
  };

  // Fetch Member from backend using code/card#/id/email
  const lookupMember = async (codeString) => {
    setError(null);
    setSearchingMember(true);
    try {
      const { data } = await api.get(`/users/lookup/${encodeURIComponent(codeString)}`);
      setSelectedMember(data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Member not found. Check card number or register user.');
    } finally {
      setSearchingMember(false);
    }
  };

  // Search members manually
  const handleMemberSearch = async (e) => {
    e.preventDefault();
    if (!memberSearchQuery.trim()) return;
    lookupMember(memberSearchQuery);
  };

  // Fetch books for selection
  const fetchAvailableBooks = async () => {
    setLoadingBooks(true);
    try {
      const { data } = await api.get('/books?limit=50');
      const inStock = (data.books || data).filter((b) => b.availableCopies > 0);
      setAvailableBooks(inStock);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoadingBooks(false);
    }
  };

  // Capture quick baseline photo from video stream
  const captureBaselineFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setBaselinePhoto(dataUrl);
    setTakingBaseline(false);
    stopCamera();
  };

  // Complete Quick Checkout
  const handleCompleteCheckOut = async () => {
    if (!selectedMember || !selectedBook) return;

    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post('/borrow/issue', {
        bookId: selectedBook._id,
        userId: selectedMember._id,
        daysToDue: Number(daysToDue) || 14,
        beforeImage: baselinePhoto || '',
      });

      setSuccessReceipt(data.borrowing);
      setStep(3);

      if (onCheckOutSuccess) {
        onCheckOutSuccess(data.borrowing);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset for next patron
  const handleResetForNext = () => {
    setSelectedMember(null);
    setSelectedBook(null);
    setBaselinePhoto('');
    setSuccessReceipt(null);
    setError(null);
    setStep(1);
    setCameraActive(true);
  };

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[90vh] relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden canvas for QR analysis */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Top Header - Always visible */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-sky-600 text-white rounded-xl shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm">Quick Check Out</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200">
                  QR Desk
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Scan member card & issue book in seconds</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-mono font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
              ESC
            </span>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-white text-[11px] font-semibold text-center shrink-0">
          <div
            className={`py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              step >= 1
                ? 'border-sky-600 text-sky-700 font-bold bg-sky-50/30'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center">
              1
            </span>
            <span>Scan QR</span>
          </div>

          <div
            className={`py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              step >= 2
                ? 'border-sky-600 text-sky-700 font-bold bg-sky-50/30'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                step >= 2 ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span>Select Book</span>
          </div>

          <div
            className={`py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              step === 3
                ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/30'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span>Completed</span>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ================= STEP 1: SCAN MEMBER QR CARD ================= */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div className="text-center space-y-0.5">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Scan Customer Library Card</h4>
                <p className="text-[11px] text-slate-500">
                  Hold member QR code up to camera or search below.
                </p>
              </div>

              {/* Compact Camera Viewport */}
              <div className="relative h-44 sm:h-48 max-w-xs mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    {/* Targeting Box */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-36 h-36 border-2 border-sky-400/90 rounded-2xl relative shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-sky-400 -mt-0.5 -ml-0.5" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-sky-400 -mt-0.5 -mr-0.5" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-sky-400 -mb-0.5 -ml-0.5" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-sky-400 -mb-0.5 -mr-0.5" />
                        <div className="absolute inset-x-2 top-1/2 h-0.5 bg-sky-400/60 animate-bounce" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-sky-400">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Scanner Inactive</p>
                      <p className="text-[10px] text-slate-400">Click below to activate</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCameraActive(true)}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Start Camera
                    </button>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setCameraActive(false);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Pause Camera
                  </button>
                </div>
              )}

              {/* Manual Member Search Fallback */}
              <div className="pt-2 border-t border-slate-100">
                <form onSubmit={handleMemberSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Or enter Card # (e.g. BN-754737) or email..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-sky-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingMember || !memberSearchQuery.trim()}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {searchingMember ? 'Finding...' : 'Find'}
                  </button>
                </form>
              </div>

              {/* Explicit Cancel / Close Button */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: SELECT BOOK & DETAILS ================= */}
          {step === 2 && selectedMember && (
            <div className="space-y-4">
              {/* Member Card Summary Banner */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {selectedMember.name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{selectedMember.name}</h4>
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                        {selectedMember.cardNumber || 'BN-CARD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                      <span>{selectedMember.email}</span>
                      <span>•</span>
                      <span className="font-medium text-sky-700">
                        {selectedMember.activeLoans || 0} / {selectedMember.maxBorrowLimit || 3} loans
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setStep(1);
                    setCameraActive(true);
                  }}
                  className="text-xs text-sky-600 hover:underline font-semibold cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Book Selection Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Select Book to Check Out
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {availableBooks.length} available
                  </span>
                </div>

                {/* Filter / Search books */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by title, author, or ISBN..."
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-sky-500"
                  />
                </div>

                {/* Available Books List */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {loadingBooks ? (
                    <div className="p-4 text-center text-xs text-slate-400">Loading library books...</div>
                  ) : (
                    availableBooks
                      .filter((b) =>
                        bookSearchQuery
                          ? b.title.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
                            b.isbn?.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
                            (b.authors && b.authors.join(' ').toLowerCase().includes(bookSearchQuery.toLowerCase()))
                          : true
                      )
                      .slice(0, 15)
                      .map((book) => {
                        const isSelected = selectedBook?._id === book._id;
                        return (
                          <div
                            key={book._id}
                            onClick={() => setSelectedBook(book)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-sky-50 border-sky-400 shadow-2xs'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={book.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=120&q=80'}
                                alt={book.title}
                                className="w-8 h-11 object-cover rounded border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <h5 className="font-bold text-slate-800 text-xs truncate">{book.title}</h5>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {book.authors?.join(', ') || 'Author'} • ISBN: {book.isbn || 'N/A'}
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  📍 {book.shelfLocation || 'Shelf B'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                {book.availableCopies} in stock
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Loan Duration & Quick Baseline Photo */}
              {selectedBook && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Loan Duration
                      </label>
                      <select
                        value={daysToDue}
                        onChange={(e) => setDaysToDue(Number(e.target.value))}
                        className="w-full text-xs font-semibold p-1.5 bg-white rounded-xl border border-slate-200 focus:outline-sky-500"
                      >
                        <option value={7}>7 Days (1 Week)</option>
                        <option value={14}>14 Days (Standard)</option>
                        <option value={21}>21 Days (3 Weeks)</option>
                        <option value={28}>28 Days (1 Month)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Pre-Loan Photo (Optional)
                      </label>
                      {baselinePhoto ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={baselinePhoto}
                            alt="Baseline"
                            className="w-8 h-8 object-cover rounded-lg border border-slate-300"
                          />
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Saved
                          </span>
                          <button
                            type="button"
                            onClick={() => setBaselinePhoto('')}
                            className="text-[10px] text-slate-400 hover:text-rose-500 ml-auto cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTakingBaseline(true);
                            startCamera();
                          }}
                          className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-sky-600" />
                          <span>Snap Photo</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {takingBaseline && (
                    <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="h-32 overflow-hidden rounded-lg bg-slate-900">
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTakingBaseline(false);
                            stopCamera();
                          }}
                          className="px-2.5 py-1 text-xs text-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={captureBaselineFromStream}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg"
                        >
                          Take Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Checkout Actions */}
              <div className="pt-2 flex justify-between items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteCheckOut}
                    disabled={submitting || !selectedBook}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        <span>Issuing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
                        <span>Confirm Check Out</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SUCCESS CONFIRMATION ================= */}
          {step === 3 && successReceipt && (
            <div className="p-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-100 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Check Out Successful!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Book issued to <span className="font-semibold text-slate-800">{successReceipt.user?.name}</span>
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 max-w-sm mx-auto">
                <div className="flex items-center gap-2.5">
                  <img
                    src={successReceipt.book?.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=120&q=80'}
                    alt="Book Cover"
                    className="w-10 h-14 object-cover rounded border border-slate-200"
                  />
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">{successReceipt.book?.title}</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Card: <span className="font-mono font-bold text-slate-700">{selectedMember?.cardNumber}</span>
                    </p>
                    <span className="text-[10px] font-bold text-sky-700 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      Due on {new Date(successReceipt.dueDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Next Customer</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
