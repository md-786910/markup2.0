import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
}

export default function PdfThumb({ file }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !file) return null;

  return (
    <div className={`kc-pdf-thumb ${loaded ? 'is-loaded' : ''}`}>
      <Document
        file={file}
        loading={null}
        error={null}
        onLoadError={() => setError(true)}
      >
        <Page
          pageNumber={1}
          width={300}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={() => setLoaded(true)}
        />
      </Document>
    </div>
  );
}

