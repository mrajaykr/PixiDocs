import { loadPdfLib } from "./loadPdfLib";

export const getPdfLib = async () => {
  if (window.PDFLib) return window.PDFLib;
  return await loadPdfLib();
};

export const mergePDFs = async (files) => {
  const { PDFDocument } = await getPdfLib();
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((p) => mergedPdf.addPage(p));
  }

  const bytes = await mergedPdf.save();
  return new Blob([bytes], { type: "application/pdf" });
};

export const splitPDF = async (file, fromPage, toPage) => {
  const { PDFDocument } = await getPdfLib();
  const data = await file.arrayBuffer();
  const pdf = await PDFDocument.load(data);

  const total = pdf.getPageCount();
  const start = Math.max(0, fromPage - 1);
  const end = Math.min(total - 1, toPage - 1);

  const newPdf = await PDFDocument.create();
  const indices = [];
  for (let i = start; i <= end; i++) indices.push(i);

  const pages = await newPdf.copyPages(pdf, indices);
  pages.forEach((p) => newPdf.addPage(p));

  const outputBytes = await newPdf.save();
  return new Blob([outputBytes], { type: "application/pdf" });
};

export const rotatePDF = async (file, angle = 90) => {
  const { PDFDocument, degrees } = await getPdfLib();
  const data = await file.arrayBuffer();
  const pdf = await PDFDocument.load(data);
  const pages = pdf.getPages();

  pages.forEach((page) => {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  });

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
};

export const removePagesPDF = async (file, pagesToRemove = [1]) => {
  const { PDFDocument } = await getPdfLib();
  const data = await file.arrayBuffer();
  const pdf = await PDFDocument.load(data);
  const total = pdf.getPageCount();

  const newPdf = await PDFDocument.create();
  const keepIndices = [];
  for (let i = 0; i < total; i++) {
    if (!pagesToRemove.includes(i + 1)) {
      keepIndices.push(i);
    }
  }

  if (keepIndices.length === 0) {
    throw new Error("Cannot remove all pages from PDF");
  }

  const copied = await newPdf.copyPages(pdf, keepIndices);
  copied.forEach((p) => newPdf.addPage(p));

  const bytes = await newPdf.save();
  return new Blob([bytes], { type: "application/pdf" });
};

export const addPageNumbersPDF = async (file) => {
  const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
  const data = await file.arrayBuffer();
  const pdf = await PDFDocument.load(data);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const total = pages.length;

  pages.forEach((page, idx) => {
    const { width } = page.getSize();
    const text = `Page ${idx + 1} of ${total}`;
    const textSize = 10;
    const textWidth = font.widthOfTextAtSize(text, textSize);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: 20,
      size: textSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
};

export const addWatermarkPDF = async (file, watermarkText = "CONFIDENTIAL") => {
  const { PDFDocument, rgb, degrees, StandardFonts } = await getPdfLib();
  const data = await file.arrayBuffer();
  const pdf = await PDFDocument.load(data);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textSize = 48;
    const textWidth = font.widthOfTextAtSize(watermarkText, textSize);
    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: textSize,
      font,
      color: rgb(0.85, 0.85, 0.85),
      rotate: degrees(45),
      opacity: 0.45,
    });
  });

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
};

export const imagesToPDF = async (imageFiles) => {
  const { PDFDocument } = await getPdfLib();
  const pdf = await PDFDocument.create();

  for (const file of imageFiles) {
    const arrayBuffer = await file.arrayBuffer();
    let image;
    if (file.type === "image/png") {
      image = await pdf.embedPng(arrayBuffer);
    } else {
      image = await pdf.embedJpg(arrayBuffer);
    }
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
};

export const nupPDF = async (file, pagesPerSheet = 4, drawBorder = true) => {
  const { PDFDocument } = await getPdfLib();
  const existingBytes = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(existingBytes);
  const outDoc = await PDFDocument.create();

  const n = parseInt(pagesPerSheet) || 4;
  const cols = n === 1 ? 1 : n === 2 ? 2 : n === 4 ? 2 : n === 6 ? 3 : n === 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);

  const sheetW = 595.28; // A4 pt
  const sheetH = 841.89;
  const cellW = sheetW / cols;
  const cellH = sheetH / rows;

  const totalPages = srcDoc.getPageCount();
  for (let i = 0; i < totalPages; i += n) {
    const page = outDoc.addPage([sheetW, sheetH]);
    for (let j = 0; j < n && i + j < totalPages; j++) {
      const col = j % cols;
      const row = Math.floor(j / cols);
      const [embedded] = await outDoc.embedPdf(srcDoc, [i + j]);

      const scale = Math.min((cellW - 16) / embedded.width, (cellH - 16) / embedded.height);
      const w = embedded.width * scale;
      const h = embedded.height * scale;
      const x = col * cellW + (cellW - w) / 2;
      const y = sheetH - (row + 1) * cellH + (cellH - h) / 2;

      page.drawPage(embedded, { x, y, width: w, height: h });
      if (drawBorder) {
        page.drawRectangle({
          x: col * cellW + 4,
          y: sheetH - (row + 1) * cellH + 4,
          width: cellW - 8,
          height: cellH - 8,
          borderWidth: 0.5,
          borderColor: { type: 'RGB', red: 0.75, green: 0.75, blue: 0.75 },
        });
      }
    }
  }

  const pdfBytes = await outDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};
