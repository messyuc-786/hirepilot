/* ============================================================
   parser.js — Pulls plain text out of uploaded files.

   PDFs are not text files. They are a layout format that stores
   glyphs and their positions on a page. PDF.js walks that structure
   and reassembles readable text from it.

   Supported here: PDF and .txt
   NOT supported: .docx (see note at the bottom of this file)
   ============================================================ */

const Parser = {

  /* ------------------------------------------------------------
     extract() — main entry point. Give it a File, get text back.
     ------------------------------------------------------------ */
  async extract(file) {
    // 1. Size check first — fail fast before doing any work.
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > CONFIG.MAX_FILE_MB) {
      throw new Error(
        `File is ${sizeMB.toFixed(1)}MB. Maximum is ${CONFIG.MAX_FILE_MB}MB.`
      );
    }

    // 2. Route by file type.
    const name = file.name.toLowerCase();

    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
      return this.fromPDF(file);
    }

    if (file.type === 'text/plain' || name.endsWith('.txt')) {
      return this.fromText(file);
    }

    if (name.endsWith('.docx') || name.endsWith('.doc')) {
      throw new Error(
        'Word files are not supported yet. Open your resume in Word, ' +
        'choose File > Save As > PDF, and upload that instead.'
      );
    }

    throw new Error('Unsupported file. Please upload a PDF or .txt file.');
  },

  /* ------------------------------------------------------------
     fromPDF() — read text out of every page of a PDF.
     ------------------------------------------------------------ */
  async fromPDF(file) {
    if (!window.pdfjsLib) {
      throw new Error('PDF reader failed to load. Check your connection and refresh.');
    }

    const buffer = await file.arrayBuffer();

    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    } catch {
      throw new Error('Could not open that PDF. It may be corrupted or password-protected.');
    }

    const pages = [];

    // Page numbers in PDF.js start at 1, not 0.
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();

      // Each "item" is a run of text with a position. Join them with
      // spaces to rebuild readable lines.
      const pageText = content.items.map(item => item.str).join(' ');
      pages.push(pageText);
    }

    const text = this.clean(pages.join('\n\n'));

    // A scanned resume is an image, so no text comes out.
    if (text.length < 50) {
      throw new Error(
        'Almost no text found. This PDF is probably a scan or image. ' +
        'Try exporting a text-based PDF from Word or Google Docs.'
      );
    }

    return text;
  },

  /* ------------------------------------------------------------
     fromText() — plain .txt files.
     ------------------------------------------------------------ */
  async fromText(file) {
    const raw = await file.text();
    return this.clean(raw);
  },

  /* ------------------------------------------------------------
     clean() — tidy whitespace so the AI gets readable input.
     ------------------------------------------------------------ */
  clean(text) {
    return text
      .replace(/\r\n/g, '\n')      // Windows line endings to Unix
      .replace(/[ \t]+/g, ' ')     // collapse runs of spaces/tabs
      .replace(/\n{3,}/g, '\n\n')  // max two blank lines in a row
      .trim();
  },
};

/* ------------------------------------------------------------
   NOTE ON .DOCX SUPPORT

   Reading .docx in the browser needs a library called Mammoth.js.
   To add it later, put this in index.html before your scripts:

     <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>

   Then add this method to Parser and route .docx files to it:

     async fromDOCX(file) {
       const buffer = await file.arrayBuffer();
       const result = await mammoth.extractRawText({ arrayBuffer: buffer });
       return this.clean(result.value);
     }

   It is left out of version 1 on purpose. Ship the smaller thing first,
   confirm it works, then add to it.
   ------------------------------------------------------------ */
