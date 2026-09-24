import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Upload,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  FileText,
  Layers,
  Sliders,
  Eye,
  Check,
} from 'lucide-react';
import CameraModal from './CameraModal';
import api from '../api/axios';

/**
 * High-precision client-side pixel comparison using HTML5 Canvas.
 * Incorporates:
 * 1. Global luminance exposure normalization to balance lighting shifts.
 * 2. Neighborhood Window Search (local radius search) to tolerate camera angles,
 *    perspective skew, hand shake, and distance shifts without false positives.
 * 3. Morphological Cluster Filtering: filters out isolated sensor noise pixels
 *    and only detects true connected damage clusters (stains, tears, burns).
 * 4. Generates an AI Difference Heatmap with highlighted defect areas.
 */
function analyzeImagesWithCanvas(beforeSrc, afterSrc, sensitivity = 'tolerant') {
  return new Promise((resolve) => {
    if (!beforeSrc || !afterSrc) {
      resolve(null);
      return;
    }

    const imgB = new Image();
    const imgA = new Image();
    imgB.crossOrigin = 'anonymous';
    imgA.crossOrigin = 'anonymous';

    let loaded = 0;
    const checkLoaded = () => {
      loaded++;
      if (loaded === 2) {
        runPixelComparison();
      }
    };

    imgB.onload = checkLoaded;
    imgA.onload = checkLoaded;
    imgB.onerror = () => resolve(null);
    imgA.onerror = () => resolve(null);

    imgB.src = beforeSrc;
    imgA.src = afterSrc;

    function runPixelComparison() {
      const W = 160;
      const H = 160;

      const canvasB = document.createElement('canvas');
      canvasB.width = W;
      canvasB.height = H;
      const ctxB = canvasB.getContext('2d');
      ctxB.drawImage(imgB, 0, 0, W, H);
      const dataB = ctxB.getImageData(0, 0, W, H).data;

      const canvasA = document.createElement('canvas');
      canvasA.width = W;
      canvasA.height = H;
      const ctxA = canvasA.getContext('2d');
      ctxA.drawImage(imgA, 0, 0, W, H);
      const dataA = ctxA.getImageData(0, 0, W, H).data;

      // 1. Calculate average luminance to normalize camera auto-exposure
      let sumLumB = 0;
      let sumLumA = 0;
      for (let i = 0; i < dataB.length; i += 4) {
        sumLumB += 0.299 * dataB[i] + 0.587 * dataB[i + 1] + 0.114 * dataB[i + 2];
        sumLumA += 0.299 * dataA[i] + 0.587 * dataA[i + 1] + 0.114 * dataA[i + 2];
      }
      const expScale = sumLumB > 0 && sumLumA > 0 ? Math.min(1.5, Math.max(0.67, sumLumB / sumLumA)) : 1;

      // Sensitivity tuning:
      // 'tolerant': tuned specifically for handheld phone / webcam photos
      let searchRadius = 8;
      let deltaThreshold = 38;
      let clusterThreshold = 2;
      let noiseFloor = 10;

      if (sensitivity === 'normal') {
        searchRadius = 6;
        deltaThreshold = 32;
        clusterThreshold = 2;
        noiseFloor = 6;
      } else if (sensitivity === 'strict') {
        searchRadius = 3;
        deltaThreshold = 25;
        clusterThreshold = 1;
        noiseFloor = 3;
      }

      // 2. Diff heatmap canvas
      const canvasDiff = document.createElement('canvas');
      canvasDiff.width = W;
      canvasDiff.height = H;
      const ctxDiff = canvasDiff.getContext('2d');
      const diffImageData = ctxDiff.createImageData(W, H);
      const diffData = diffImageData.data;

      const anomalyMap = new Uint8Array(W * H);
      const lumDiffMap = new Int16Array(W * H);

      // First pass: Neighborhood window search
      for (let y = searchRadius; y < H - searchRadius; y++) {
        for (let x = searchRadius; x < W - searchRadius; x++) {
          const idxA = (y * W + x) * 4;
          const rA = Math.min(255, dataA[idxA] * expScale);
          const gA = Math.min(255, dataA[idxA + 1] * expScale);
          const bA = Math.min(255, dataA[idxA + 2] * expScale);
          const lumA = 0.299 * rA + 0.587 * gA + 0.114 * bA;

          let minDelta = 999;
          let bestMatchedLumB = lumA;

          for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
            const ny = y + dy;
            for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
              const nx = x + dx;
              const idxB = (ny * W + nx) * 4;
              const dr = Math.abs(dataB[idxB] - rA);
              const dg = Math.abs(dataB[idxB + 1] - gA);
              const db = Math.abs(dataB[idxB + 2] - bA);
              const delta = (dr + dg + db) / 3;

              if (delta < minDelta) {
                minDelta = delta;
                bestMatchedLumB = 0.299 * dataB[idxB] + 0.587 * dataB[idxB + 1] + 0.114 * dataB[idxB + 2];
                if (delta < 20) break;
              }
            }
            if (minDelta < 20) break;
          }

          if (minDelta > deltaThreshold) {
            anomalyMap[y * W + x] = Math.min(255, minDelta);
            lumDiffMap[y * W + x] = Math.round(bestMatchedLumB - lumA);
          }
        }
      }

      // Second pass: Morphological cluster filtering (removes isolated camera noise)
      let defectPixels = 0;
      let darkStainPixels = 0;
      let tearCreasePixels = 0;
      const validArea = (W - 2 * searchRadius) * (H - 2 * searchRadius);

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const pos = y * W + x;

          if (
            y >= searchRadius &&
            y < H - searchRadius &&
            x >= searchRadius &&
            x < W - searchRadius &&
            anomalyMap[pos] > 0
          ) {
            // Count neighboring anomalies in a 3x3 window
            let neighborCount = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (anomalyMap[(y + dy) * W + (x + dx)] > 0) {
                  neighborCount++;
                }
              }
            }

            // Real defects form continuous clusters; isolated points are camera noise
            if (neighborCount >= clusterThreshold) {
              defectPixels++;

              if (lumDiffMap[pos] > 35) {
                darkStainPixels++;
              }
              if (anomalyMap[pos] > 75) {
                tearCreasePixels++;
              }

              // Highlight defect on heatmap
              diffData[i] = 239;     // Red
              diffData[i + 1] = 68;
              diffData[i + 2] = 68;
              diffData[i + 3] = 230; // High opacity
              continue;
            }
          }

          // Non-defect pixels: keep original After-book image with subtle tint
          diffData[i] = dataA[i];
          diffData[i + 1] = dataA[i + 1];
          diffData[i + 2] = dataA[i + 2];
          diffData[i + 3] = 75; // Faded backdrop to emphasize defect areas
        }
      }

      ctxDiff.putImageData(diffImageData, 0, 0);
      const diffHeatmapUrl = canvasDiff.toDataURL('image/png');

      let score = 0;
      const defects = [];

      if (defectPixels <= noiseFloor) {
        // Book is intact
        score = 0;
        defects.push('Book cover and binding intact. No physical damage detected.');
      } else if (defectPixels <= 60) {
        // Minor wear range (15% - 30% score, $5.00 fee)
        score = Math.round(15 + ((defectPixels - noiseFloor) / Math.max(1, 60 - noiseFloor)) * 15);
        if (darkStainPixels > 8) defects.push('Light stain or ink smudge detected');
        if (tearCreasePixels > 8) defects.push('Surface scratch or handling crease detected');
        if (defects.length === 0) defects.push('Minor surface scuff or handling wear detected');
      } else if (defectPixels <= 280) {
        // Moderate damage range (35% - 60% score, $15.00 fee)
        score = Math.round(35 + ((defectPixels - 60) / (280 - 60)) * 25);
        if (darkStainPixels > 20) defects.push('Liquid spill, dark stain, or ink smudge detected');
        if (tearCreasePixels > 20) defects.push('Surface tear, sharp crease, or binding edge damage detected');
        if (defects.length === 0) defects.push('Moderate cover wear or surface abrasions detected');
      } else {
        // Severe damage range (65% - 100% score, replacement fee)
        score = Math.min(100, Math.round(65 + ((defectPixels - 280) / 350) * 35));
        defects.push('Significant cover deformation, deep stains, or tear detected');
      }

      resolve({
        damageScore: score,
        diffHeatmapUrl,
        defects,
        defectPixels,
        stainRatio: validArea > 0 ? darkStainPixels / validArea : 0,
        tearRatio: validArea > 0 ? tearCreasePixels / validArea : 0,
        sensitivity,
      });
    }
  });
}

export default function DamageInspectorModal({
  isOpen,
  onClose,
  borrowing = null,
  book = null,
  onDamageAssessed,
}) {
  const [beforeImage, setBeforeImage] = useState(borrowing?.beforeImage || '');
  const [afterImage, setAfterImage] = useState(borrowing?.afterImage || '');
  const [assessing, setAssessing] = useState(false);
  const [report, setReport] = useState(borrowing?.damageReport || null);
  const [error, setError] = useState(null);

  // AI Sensitivity setting: 'tolerant' (Handheld Phone/Webcam), 'normal', 'strict'
  const [sensitivity, setSensitivity] = useState('tolerant');

  // View mode: 'photos' or 'heatmap'
  const [viewMode, setViewMode] = useState('photos');
  const [heatmapUrl, setHeatmapUrl] = useState(null);

  // Librarian Manual Overrides
  const [manualScore, setManualScore] = useState(borrowing?.damageReport?.damageScore || 0);
  const [manualFee, setManualFee] = useState(borrowing?.damageFee || 0);
  const [manualLevel, setManualLevel] = useState(borrowing?.damageReport?.damageLevel || 'none');
  const [applyingFee, setApplyingFee] = useState(false);

  // Camera modal state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState('before'); // 'before' or 'after'

  const bookTitle = borrowing?.book?.title || book?.title || 'Book Inspection';
  const memberName = borrowing?.user?.name || 'Patron Loan';

  const openCameraFor = (target) => {
    setCameraTarget(target);
    setCameraOpen(true);
  };

  const handleCaptureImage = (dataUrl) => {
    if (cameraTarget === 'before') {
      setBeforeImage(dataUrl);
    } else {
      setAfterImage(dataUrl);
    }
    setReport(null);
    setHeatmapUrl(null);
  };

  // Run Hugging Face Damage Assessment with Canvas Pixel Differencing
  const handleAssessDamage = async (overrideSensitivity = sensitivity) => {
    if (!afterImage) {
      setError('Please capture or upload the After-Loan book photo to inspect.');
      return;
    }

    setAssessing(true);
    setError(null);

    try {
      // 1. Compute client-side pixel comparison using HTML5 Canvas with neighborhood matching
      let visualMetrics = null;
      if (beforeImage && afterImage) {
        visualMetrics = await analyzeImagesWithCanvas(beforeImage, afterImage, overrideSensitivity);
        if (visualMetrics?.diffHeatmapUrl) {
          setHeatmapUrl(visualMetrics.diffHeatmapUrl);
        }
      }

      // 2. Call backend AI damage assess endpoint
      const { data } = await api.post('/ai/damage-assess', {
        beforeImage,
        afterImage,
        borrowingId: borrowing?._id,
        bookId: borrowing?.book?._id || book?._id,
        visualMetrics,
      });

      setReport(data.report);
      setManualScore(data.report.damageScore);
      setManualFee(data.report.damageFee);
      setManualLevel(data.report.damageLevel);

      if (onDamageAssessed) {
        onDamageAssessed(data);
      }
    } catch (err) {
      console.error('Damage assessment error:', err);
      setError(err.response?.data?.message || 'Failed to complete damage assessment.');
    } finally {
      setAssessing(false);
    }
  };

  // Change sensitivity and re-run if images are present
  const handleSensitivityChange = (newSens) => {
    setSensitivity(newSens);
    if (beforeImage && afterImage && report) {
      handleAssessDamage(newSens);
    }
  };

  // Save manual adjustments to borrowing in MongoDB
  const handleApplyCustomFee = async () => {
    if (!borrowing?._id) return;
    setApplyingFee(true);
    try {
      const updatedReport = {
        ...(report || {}),
        damageScore: Number(manualScore),
        damageFee: Number(manualFee),
        damageLevel: manualLevel,
        modelUsed: report?.modelUsed || 'AI Vision Inspection Engine',
        assessedAt: new Date(),
      };

      await api.put(`/borrow/inspect/${borrowing._id}`, {
        beforeImage,
        afterImage,
        damageFee: Number(manualFee),
        damageReport: updatedReport,
      });

      setReport(updatedReport);
      if (onDamageAssessed) {
        onDamageAssessed({ report: updatedReport });
      }
    } catch (err) {
      console.error('Failed to update fee:', err);
      setError('Failed to update loan record with custom fee.');
    } finally {
      setApplyingFee(false);
    }
  };

  // Sync state whenever borrowing prop or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setBeforeImage(borrowing?.beforeImage || '');
      setAfterImage(borrowing?.afterImage || '');
      setReport(borrowing?.damageReport || null);
      setManualScore(borrowing?.damageReport?.damageScore || 0);
      setManualFee(borrowing?.damageFee || 0);
      setManualLevel(borrowing?.damageReport?.damageLevel || 'none');
      setError(null);
      setHeatmapUrl(borrowing?.damageReport?.diffHeatmapUrl || null);
      setViewMode('photos');
    }
  }, [isOpen, borrowing]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const severityColor = {
    none: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    minor: 'bg-amber-50 text-amber-700 border-amber-200',
    moderate: 'bg-orange-50 text-orange-700 border-orange-200',
    severe: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  if (!isOpen) return null;

  const modalNode = (
    <>
      <div
        className="fixed inset-0 z-[100] overflow-y-auto p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 flex justify-center items-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">Book Damage Inspection</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  AI Inspection
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Comparing condition of <span className="font-medium text-slate-800">"{bookTitle}"</span> for {memberName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] font-mono font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                ESC
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content Scroll Area */}
          <div className="p-6 overflow-y-auto space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* View Mode Switcher (if heatmap is generated) */}
            {heatmapUrl && (
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-600 pl-1">Display View:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setViewMode('photos')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      viewMode === 'photos'
                        ? 'bg-white shadow-2xs text-sky-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Original Photos
                  </button>
                  <button
                    onClick={() => setViewMode('heatmap')}
                    className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
                      viewMode === 'heatmap'
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>AI Difference Heatmap</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Visual Panels */}
            {viewMode === 'heatmap' && heatmapUrl ? (
              <div className="p-4 bg-slate-950 rounded-2xl flex flex-col items-center justify-center space-y-2">
                <img
                  src={heatmapUrl}
                  alt="Difference Heatmap"
                  className="max-h-[300px] w-auto rounded-xl border border-white/20 shadow-lg object-contain"
                />
                <p className="text-[11px] text-slate-300">
                  <span className="text-rose-400 font-bold">Red regions</span> highlight physical differences, stains, or creases compared to the baseline.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* BEFORE Photo Panel */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      1. Before Loan (Baseline)
                    </span>
                    <button
                      onClick={() => openCameraFor('before')}
                      className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{beforeImage ? 'Retake' : 'Capture'}</span>
                    </button>
                  </div>

                  <div className="aspect-4/3 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                    {beforeImage ? (
                      <img
                        src={beforeImage}
                        alt="Before condition"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        onClick={() => openCameraFor('before')}
                        className="text-center p-4 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">No baseline photo</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click camera to capture</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AFTER Photo Panel */}
                <div className="p-4 bg-sky-50/40 rounded-2xl border border-sky-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                      2. After Return (Inspection)
                    </span>
                    <button
                      onClick={() => openCameraFor('after')}
                      className="text-xs text-white bg-sky-600 hover:bg-sky-700 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-2xs transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{afterImage ? 'Retake' : 'Capture'}</span>
                    </button>
                  </div>

                  <div className="aspect-4/3 rounded-xl bg-white border-2 border-dashed border-sky-200 hover:border-sky-400 flex items-center justify-center overflow-hidden relative transition-colors">
                    {afterImage ? (
                      <img
                        src={afterImage}
                        alt="After condition"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        onClick={() => openCameraFor('after')}
                        className="text-center p-4 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <div className="p-3 bg-sky-100 text-sky-600 rounded-full w-fit mx-auto mb-2">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-sky-900">Take return inspection photo</p>
                        <p className="text-[11px] text-sky-600 mt-0.5">Access device camera or upload</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI Sensitivity Tuning Control */}
            <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Sliders className="w-3.5 h-3.5 text-sky-600" />
                  <span>AI Camera Sensitivity</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {sensitivity === 'tolerant' && '✨ Tolerant: Ignores camera angle, hand tilt, and desk background'}
                  {sensitivity === 'normal' && '⚖️ Balanced: Standard sensitivity for steady tabletop'}
                  {sensitivity === 'strict' && '🔍 Strict: High precision for scanner or fixed tripod'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSensitivityChange('tolerant')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                    sensitivity === 'tolerant'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  Tolerant (Handheld Camera)
                </button>
                <button
                  type="button"
                  onClick={() => handleSensitivityChange('normal')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                    sensitivity === 'normal'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  Balanced (Tabletop)
                </button>
                <button
                  type="button"
                  onClick={() => handleSensitivityChange('strict')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                    sensitivity === 'strict'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  Strict (Scanner / Tripod)
                </button>
              </div>
            </div>

            {/* Run Assessment Action */}
            <div className="flex items-center justify-center">
              <button
                onClick={() => handleAssessDamage(sensitivity)}
                disabled={assessing || !afterImage}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {assessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Analyzing Physical Condition & AI Inspection...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Calculate Book Damage & Fee</span>
                  </>
                )}
              </button>
            </div>

            {/* Assessment Results Card */}
            {report && (
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in slide-in-from-bottom-2">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      AI Damage Assessment Report
                    </span>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                      Engine: {report.modelUsed || 'AI Vision Inspection Engine'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                        severityColor[manualLevel] || severityColor.none
                      }`}
                    >
                      {manualLevel} Damage ({manualScore}%)
                    </span>
                    <span className="text-base font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      Fee: ₹{Number(manualFee).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Detected Defects Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Detected Physical Findings
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {report.defects && report.defects.length > 0 ? (
                      report.defects.map((defect, i) => (
                        <span
                          key={i}
                          className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                        >
                          • {defect}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-600 font-medium">
                        No actionable physical damage detected. Book is in intact condition.
                      </span>
                    )}
                  </div>
                </div>

                {/* Librarian Manual Adjustment Controls */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-600" />
                      <span>Adjust Damage Score & Fee (Librarian Control)</span>
                    </span>
                    {borrowing && (
                      <button
                        onClick={handleApplyCustomFee}
                        disabled={applyingFee}
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{applyingFee ? 'Saving...' : 'Apply to Loan'}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Damage Score: {manualScore}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={manualScore}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setManualScore(val);
                          if (val <= 6) {
                            setManualLevel('none');
                            setManualFee(0);
                          } else if (val <= 25) {
                            setManualLevel('minor');
                            setManualFee(50);
                          } else if (val <= 55) {
                            setManualLevel('moderate');
                            setManualFee(150);
                          } else {
                            setManualLevel('severe');
                            setManualFee(500);
                          }
                        }}
                        className="w-full accent-sky-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Severity Category</label>
                      <select
                        value={manualLevel}
                        onChange={(e) => {
                          const lvl = e.target.value;
                          setManualLevel(lvl);
                          if (lvl === 'none') setManualFee(0);
                          else if (lvl === 'minor') setManualFee(50);
                          else if (lvl === 'moderate') setManualFee(150);
                          else if (lvl === 'severe') setManualFee(500);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="none">None (0%)</option>
                        <option value="minor">Minor (₹50.00)</option>
                        <option value="moderate">Moderate (₹150.00)</option>
                        <option value="severe">Severe (₹500.00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Custom Fee (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={manualFee}
                        onChange={(e) => setManualFee(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Notes */}
                {report.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100">
                    <span className="font-semibold text-slate-800 block mb-0.5">Inspector Summary:</span>
                    {report.notes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Close
            </button>

            {report && borrowing && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Damage fee recorded on member loan</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Camera Modal */}
      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCaptureImage}
        title={cameraTarget === 'before' ? 'Capture Before-Loan Photo' : 'Capture After-Return Photo'}
        description={
          cameraTarget === 'before'
            ? 'Record initial baseline condition of the book before checkout.'
            : 'Capture current condition of the returned book for damage evaluation.'
        }
      />
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
