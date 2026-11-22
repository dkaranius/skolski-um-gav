import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { ChatReferenceDocument } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function maskOibNumbers(text: string): { masked: string; count: number } {
  let count = 0;
  const masked = text.replace(/\b\d{11}\b/g, () => {
    count += 1;
    return '[OIB-ZAŠTIĆENO]';
  });
  return { masked, count };
}

export async function parseReferenceDocument(
  file: File,
  maskOib = true
): Promise<ChatReferenceDocument> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let extractedText = '';
  let pageCount: number | undefined;
  let fileType = ext.toUpperCase() || 'DOKUMENT';

  if (ext === 'pdf') {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    pageCount = pdf.numPages;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      pages.push(`[Stranica ${i}]\n${strings.join(' ')}`);
    }
    extractedText = pages.join('\n\n');
    fileType = 'PDF';
  } else if (ext === 'docx') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    extractedText = result.value;
    fileType = 'WORD (.docx)';
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetsText: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      // Strip personal identifier columns automatically
      const safeRows = rows.slice(0, 120).map((r) => {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          const lk = k
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          if (
            lk.includes('ime') ||
            lk.includes('prezime') ||
            lk.includes('oib') ||
            lk.includes('roditelj') ||
            lk.includes('skrbnik') ||
            lk.includes('adresa') ||
            lk.includes('telefon')
          ) {
            continue;
          }
          clean[k] = v;
        }
        return clean;
      });
      sheetsText.push(`[List: ${sheetName}]\n${JSON.stringify(safeRows, null, 2)}`);
    }
    extractedText = sheetsText.join('\n\n');
    fileType = 'EXCEL';
  } else if (ext === 'txt' || ext === 'csv' || ext === 'md') {
    extractedText = await file.text();
    fileType = ext.toUpperCase();
  } else {
    throw new Error(
      `Format ".${ext}" nije podržan. Koristite PDF, Word (.docx), Excel (.xlsx/.xls), CSV ili TXT.`
    );
  }

  const trimmed = extractedText.trim();
  if (!trimmed) {
    throw new Error(
      `Datoteka "${file.name}" ne sadrži čitljiv tekst (npr. skenirani PDF bez tekstualnog sloja).`
    );
  }

  let finalText = trimmed;
  let piiMaskedCount = 0;
  if (maskOib) {
    const res = maskOibNumbers(finalText);
    finalText = res.masked;
    piiMaskedCount = res.count;
  }

  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    fileType,
    charCount: finalText.length,
    pageCount,
    text: finalText.slice(0, 60000),
    enabled: true,
    piiMaskedCount,
  };
}
