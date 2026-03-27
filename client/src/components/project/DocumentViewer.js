import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import html2canvas from 'html2canvas';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api';
// Strip /api suffix to get the server origin for static file serving
const SERVER_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

function getDocPageUrl(doc, pageNum) {
  return `doc:${doc.filename}:page:${pageNum}`;
}

export function parseDocPageUrl(pageUrl) {
  if (!pageUrl || !pageUrl.startsWith('doc:')) return null;
  const parts = pageUrl.split(':');
  return { filename: parts[1], page: parseInt(parts[3], 10) };
}

export default function DocumentViewer({
  documents,
  currentDocIndex,
  currentPage,
  onPageChange,
  onDocIndexChange,
  pinMode,
  pins,
  selectedPinId,
  hidePins,
  onDocumentClick,
  onPinClick,
  onScreenshot,
  viewportWidth,
}) {
  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(viewportWidth);
  const [loading, setLoading] = useState(true);

  const currentDoc = documents[currentDocIndex] || documents[0];
  const isPdf = currentDoc?.mimetype === 'application/pdf';
  const fileUrl = currentDoc ? `${SERVER_ORIGIN}/${currentDoc.path}` : null;

  // Compute width to fit container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setPageWidth(Math.min(entry.contentRect.width - 48, viewportWidth));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [viewportWidth]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n);
    setLoading(false);
  }, []);

  const handleClick = useCallback((e) => {
    if (!pinMode || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

    // Open popup immediately without screenshot
    onDocumentClick({
      xPercent,
      yPercent,
      viewportXPercent: xPercent,
      viewportYPercent: yPercent,
      pageUrl: getDocPageUrl(currentDoc, currentPage),
      documentWidth: rect.width,
      documentHeight: rect.height,
      selector: null,
      elementOffsetX: null,
      elementOffsetY: null,
      deviceMode: 'desktop',
      screenshot: null,
    });

    // Capture screenshot in background — delivered via onScreenshot prop
    const target = pageRef.current;
    html2canvas(target, { useCORS: true, scale: 1, logging: false })
      .then((canvas) => {
        if (onScreenshot) onScreenshot(canvas.toDataURL('image/jpeg', 0.8));
      })
      .catch((err) => console.warn('Screenshot capture failed:', err));
  }, [pinMode, currentDoc, currentPage, onDocumentClick, onScreenshot]);

  const totalPages = isPdf ? (numPages || currentDoc.pageCount || 1) : documents.length;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto bg-gray-100 flex flex-col">
      {/* Disable pointer-events on PDF text/annotation layers in pin mode
          so clicks always reach our handler. Scoped to .pin-mode-active. */}
      {pinMode && (
        <style>{`
          .pin-mode-active .react-pdf__Page__textContent,
          .pin-mode-active .react-pdf__Page__annotations,
          .pin-mode-active .react-pdf__Page__annotations section {
            pointer-events: none !important;
          }
        `}</style>
      )}
      {/* Document content */}
      <div className="flex-1 overflow-auto flex justify-center py-6 px-6">
        <div
          ref={pageRef}
          className={`relative bg-white shadow-lg${pinMode ? ' pin-mode-active' : ''}`}
          style={{ cursor: pinMode ? 'crosshair' : 'default' }}
          onClick={handleClick}
        >
          {isPdf && fileUrl ? (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => { console.error('PDF load error:', err); setLoading(false); }}
              loading={
                <div className="flex items-center justify-center" style={{ width: pageWidth, height: 600 }}>
                  <div className="w-8 h-8 border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          ) : fileUrl ? (
            <img
              src={fileUrl}
              alt={currentDoc.originalName}
              style={{ width: pageWidth, height: 'auto' }}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              draggable={false}
            />
          ) : null}

          {/* Click-catching overlay for pin mode — sits above PDF text/annotation layers
              so clicks always reach the parent handler instead of being swallowed */}
          {pinMode && (
            <div className="absolute inset-0 z-[5]" style={{ cursor: 'crosshair' }} />
          )}

          {/* Pin overlay */}
          {!hidePins && pins.map((pin) => (
            <div
              key={pin._id}
              className="absolute z-10"
              style={{
                left: `${pin.xPercent}%`,
                top: `${pin.yPercent}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPinClick(pin);
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                  pin._id === selectedPinId
                    ? 'bg-blue-600 text-white border-blue-700 scale-125 shadow-lg'
                    : pin.status === 'resolved'
                    ? 'bg-green-500 text-white border-green-600 hover:scale-110'
                    : 'bg-red-500 text-white border-red-600 hover:scale-110'
                }`}
              >
                {pin.pinNumber}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Page navigation bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2.5 flex items-center justify-center gap-3">
        {/* Document switcher (when multiple documents) */}
        {documents.length > 1 && (
          <>
            <select
              value={currentDocIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                onDocIndexChange(idx);
                onPageChange(1);
                setLoading(true);
              }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {documents.map((doc, i) => (
                <option key={i} value={i}>
                  {doc.originalName}
                </option>
              ))}
            </select>
            <div className="w-px h-5 bg-gray-200" />
          </>
        )}

        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-sm text-gray-600 font-medium min-w-[80px] text-center">
          {isPdf ? `Page ${currentPage} of ${totalPages}` : `Image ${currentDocIndex + 1} of ${documents.length}`}
        </span>

        <button
          onClick={() => {
            if (isPdf) {
              onPageChange(Math.min(totalPages, currentPage + 1));
            } else {
              // For images, navigate to next document
              if (currentDocIndex < documents.length - 1) {
                onDocIndexChange(currentDocIndex + 1);
              }
            }
          }}
          disabled={isPdf ? currentPage >= totalPages : currentDocIndex >= documents.length - 1}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
          <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="mt-4 text-sm font-medium text-gray-500">Loading document...</p>
        </div>
      )}
    </div>
  );
}
