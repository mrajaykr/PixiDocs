let pdfLibPromise = null;

export const loadPdfLib = () => {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);

  if (!pdfLibPromise) {
    pdfLibPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
      script.async = true;
      script.onload = () => resolve(window.PDFLib);
      script.onerror = () => reject("Failed to load PDF-lib");
      document.head.appendChild(script);
    });
  }

  return pdfLibPromise;
};
