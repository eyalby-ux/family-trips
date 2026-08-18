const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';
const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm';

export async function extractSourceContent(file, onProgress = () => {}) {
  if (!file) return { text: '', engine: 'none', warnings: ['לא התקבל קובץ לחילוץ'] };

  if (file.type === 'application/pdf') {
    return extractPdfText(file, onProgress);
  }

  if (file.type.startsWith('image/')) {
    return extractImageText(file, onProgress);
  }

  return { text: '', engine: 'none', warnings: ['סוג הקובץ אינו נתמך לחילוץ תוכן'] };
}

async function extractPdfText(file, onProgress) {
  try {
    onProgress('טוען מנוע קריאת PDF');
    const pdfjs = await import(/* @vite-ignore */ PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

    const data = new Uint8Array(await file.arrayBuffer());
    const document = await pdfjs.getDocument({ data }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      onProgress(`קורא עמוד ${pageNumber} מתוך ${document.numPages}`);
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str || '').join(' '));
    }

    const text = pages.join('\n').replace(/\s+/g, ' ').trim();
    if (!text) {
      return {
        text: '',
        engine: 'pdfjs',
        warnings: ['לא נמצא טקסט מובנה ב־PDF. ייתכן שזה PDF סרוק; נסה צילום/תמונה או השלם ידנית.'],
      };
    }

    return { text, engine: 'pdfjs', warnings: [] };
  } catch (error) {
    console.error('PDF extraction failed', error);
    return {
      text: '',
      engine: 'pdfjs-error',
      warnings: ['קריאת תוכן ה־PDF נכשלה. המקור נשמר וניתן להשלים את ההצעה ידנית.'],
    };
  }
}

async function extractImageText(file, onProgress) {
  try {
    onProgress('טוען OCR מקומי בדפדפן');
    const { createWorker } = await import(/* @vite-ignore */ TESSERACT_URL);
    const worker = await createWorker(['eng', 'heb'], 1, {
      logger(message) {
        if (message?.status) {
          const pct = Number.isFinite(message.progress) ? ` ${Math.round(message.progress * 100)}%` : '';
          onProgress(`${message.status}${pct}`);
        }
      },
    });

    const result = await worker.recognize(file);
    await worker.terminate();
    const text = String(result?.data?.text || '').replace(/\s+/g, ' ').trim();

    if (!text) {
      return {
        text: '',
        engine: 'tesseract',
        warnings: ['OCR לא זיהה טקסט בתמונה. המקור נשמר וניתן להשלים ידנית.'],
      };
    }

    return { text, engine: 'tesseract', warnings: [] };
  } catch (error) {
    console.error('Image OCR failed', error);
    return {
      text: '',
      engine: 'tesseract-error',
      warnings: ['זיהוי הטקסט בתמונה נכשל. המקור נשמר וניתן להשלים את ההצעה ידנית.'],
    };
  }
}

export async function sha256File(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Text(value) {
  const bytes = new TextEncoder().encode(String(value || '').trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

