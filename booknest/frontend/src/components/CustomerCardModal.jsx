import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Printer,
  Download,
  ShieldCheck,
  BookOpen,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

export default function CustomerCardModal({ isOpen, onClose, user }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  const cardNumber = user?.cardNumber || `BN-${(user?._id || '123456').slice(-6).toUpperCase()}`;

  useEffect(() => {
    if (!isOpen || !user) return;

    // Generate QR payload containing standard card identifier
    const qrPayload = JSON.stringify({
      type: 'booknest-card',
      id: user._id,
      card: cardNumber,
      name: user.name,
      email: user.email,
    });

    QRCode.toDataURL(
      qrPayload,
      {
        width: 280,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [isOpen, user, cardNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `BookNest-Card-${cardNumber}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 flex justify-center items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <QrCode className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Library Member Pass</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-mono font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              title="Close Pass (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <p className="text-xs text-slate-500 text-center">
            Show this digital QR pass at the front desk for instant, contactless book checkout.
          </p>

          {/* The Physical-Style Digital Card */}
          <div
            ref={cardRef}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl border border-slate-700/60"
          >
            {/* Subtle decorative circles */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

            {/* Top row: Brand & Pass Tag */}
            <div className="flex items-center justify-between relative z-10 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 shadow-md">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight text-white leading-none">
                    BookNest
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">Digital Library Pass</span>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Active Patron
              </span>
            </div>

            {/* Center: High-contrast QR Code Badge */}
            <div className="flex flex-col items-center justify-center my-2 relative z-10">
              <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-white/80">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${cardNumber}`}
                    className="w-40 h-40 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                    <QrCode className="w-10 h-10 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-widest text-slate-200 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  {cardNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCard}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Copy Card Number"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Bottom row: Member Details */}
            <div className="mt-5 pt-3 border-t border-slate-700/80 flex items-end justify-between relative z-10 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Cardholder
                </span>
                <span className="font-bold text-white text-sm block truncate max-w-[200px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                  {user.email}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Limit
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  {user.maxBorrowLimit || 3} Books
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>
            <button
              onClick={handleDownload}
              type="button"
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR</span>
            </button>
          </div>

          {/* Quick Dismiss Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
