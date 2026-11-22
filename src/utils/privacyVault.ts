import * as XLSX from 'xlsx';
import {
  AnonymizedClassStats,
  GeneratedDocument,
  LocalStudentRecord,
} from '../types';

function classifyGrade(avg: number): LocalStudentRecord['opciUspjeh'] {
  if (avg >= 4.5) return 'Odličan';
  if (avg >= 3.5) return 'Vrlo dobar';
  if (avg >= 2.5) return 'Dobar';
  if (avg >= 1.5) return 'Dovoljan';
  return 'Nedovoljan';
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function parseStudentSpreadsheetLocally(
  file: File
): Promise<LocalStudentRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Datoteka ne sadrži niti jedan radni list.');
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  if (rows.length === 0) {
    throw new Error('Tablica je prazna. Provjerite prvi radni list u datoteci.');
  }

  return rows.map((row, index) => {
    const mapped: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      mapped[normalizeHeader(key)] = val;
    }

    const imePrezime = String(
      mapped['ime i prezime'] ??
        mapped['ucenik'] ??
        mapped['ime'] ??
        mapped['student'] ??
        `Učenik #${index + 1}`
    ).trim();

    const razred = String(
      mapped['razred'] ?? mapped['odjel'] ?? mapped['razredni odjel'] ?? 'Opći'
    ).trim();

    const roditelj = String(
      mapped['roditelj'] ??
        mapped['skrbnik'] ??
        mapped['ime roditelja'] ??
        '[Podatak o roditelju]'
    ).trim();

    const rawAvg = Number(
      String(
        mapped['prosjek'] ??
          mapped['prosjek ocjena'] ??
          mapped['ocjena'] ??
          mapped['opci uspjeh'] ??
          '4.0'
      ).replace(',', '.')
    );
    const prosjekOcjena = Number.isFinite(rawAvg)
      ? Math.min(5, Math.max(1, Number(rawAvg.toFixed(2))))
      : 4.0;

    const opravdaniSati = Math.max(
      0,
      Number(
        mapped['opravdani'] ??
          mapped['opravdani sati'] ??
          mapped['opravdano'] ??
          0
      ) || 0
    );

    const neopravdaniSati = Math.max(
      0,
      Number(
        mapped['neopravdani'] ??
          mapped['neopravdani sati'] ??
          mapped['neopravdano'] ??
          0
      ) || 0
    );

    const pedagoskaMjera = String(
      mapped['pedagoska mjera'] ?? mapped['mjera'] ?? ''
    ).trim();

    return {
      id: `loc-${index + 1}-${Date.now()}`,
      imePrezime,
      razred,
      roditelj,
      prosjekOcjena,
      opravdaniSati,
      neopravdaniSati,
      opciUspjeh: classifyGrade(prosjekOcjena),
      pedagoskaMjera: pedagoskaMjera || undefined,
    };
  });
}

export function computeAnonymizedStats(
  students: LocalStudentRecord[],
  sourceLabel: string
): AnonymizedClassStats | null {
  if (students.length === 0) return null;

  const byClass = new Map<string, LocalStudentRecord[]>();
  const gradeDistribution = {
    odlican: 0,
    vrloDobar: 0,
    dobar: 0,
    dovoljan: 0,
    nedovoljan: 0,
  };

  let sumGrades = 0;
  let totalJustifiedAbsences = 0;
  let totalUnjustifiedAbsences = 0;

  for (const s of students) {
    sumGrades += s.prosjekOcjena;
    totalJustifiedAbsences += s.opravdaniSati;
    totalUnjustifiedAbsences += s.neopravdaniSati;

    if (s.opciUspjeh === 'Odličan') gradeDistribution.odlican += 1;
    else if (s.opciUspjeh === 'Vrlo dobar') gradeDistribution.vrloDobar += 1;
    else if (s.opciUspjeh === 'Dobar') gradeDistribution.dobar += 1;
    else if (s.opciUspjeh === 'Dovoljan') gradeDistribution.dovoljan += 1;
    else gradeDistribution.nedovoljan += 1;

    const list = byClass.get(s.razred) ?? [];
    list.push(s);
    byClass.set(s.razred, list);
  }

  const classBreakdown = Array.from(byClass.entries()).map(([razred, list]) => {
    const count = list.length;
    const avgGrade = Number(
      (list.reduce((acc, item) => acc + item.prosjekOcjena, 0) / count).toFixed(2)
    );
    const avgJustifiedAbsences = Number(
      (list.reduce((acc, item) => acc + item.opravdaniSati, 0) / count).toFixed(1)
    );
    const avgUnjustifiedAbsences = Number(
      (list.reduce((acc, item) => acc + item.neopravdaniSati, 0) / count).toFixed(1)
    );
    return {
      razred,
      count,
      avgGrade,
      avgJustifiedAbsences,
      avgUnjustifiedAbsences,
    };
  });

  return {
    totalStudents: students.length,
    classBreakdown,
    gradeDistribution,
    overallAvgGrade: Number((sumGrades / students.length).toFixed(2)),
    totalJustifiedAbsences,
    totalUnjustifiedAbsences,
    sourceLabel,
    piiStripped: true,
  };
}

export function downloadSampleTemplateXlsx() {
  const rows = [
    {
      'Ime i prezime': 'Primjer Učenik 1',
      Razred: '2.a',
      Roditelj: 'Primjer Roditelj 1',
      'Prosjek ocjena': 4.65,
      'Opravdani sati': 12,
      'Neopravdani sati': 0,
      'Pedagoška mjera': '',
    },
    {
      'Ime i prezime': 'Primjer Učenik 2',
      Razred: '2.a',
      Roditelj: 'Primjer Roditelj 2',
      'Prosjek ocjena': 3.25,
      'Opravdani sati': 34,
      'Neopravdani sati': 12,
      'Pedagoška mjera': 'Ukor',
    },
    {
      'Ime i prezime': 'Primjer Učenik 3',
      Razred: '2.b',
      Roditelj: 'Primjer Roditelj 3',
      'Prosjek ocjena': 4.1,
      'Opravdani sati': 19,
      'Neopravdani sati': 3,
      'Pedagoška mjera': '',
    },
  ];
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'eDnevnik_Izvoz');
  XLSX.writeFile(workbook, 'Predlozak_eDnevnik_Ucenici.xlsx');
}

export function mergeLocalStudentIntoDocument(
  doc: GeneratedDocument,
  student: LocalStudentRecord | null
): GeneratedDocument {
  if (!student) return doc;

  const replaceTokens = (text: string) =>
    text
      .replace(/\[IME I PREZIME UČENIKA\]/gi, student.imePrezime)
      .replace(/\[UČENIK\]/gi, student.imePrezime)
      .replace(/\[RAZRED\]/gi, student.razred)
      .replace(/\[IME I PREZIME RODITELJA\/SKRBNIKA\]/gi, student.roditelj)
      .replace(/\[IME I PREZIME RODITELJA\]/gi, student.roditelj)
      .replace(/\[RODITELJ\]/gi, student.roditelj);

  return {
    ...doc,
    recipientPlaceholder: replaceTokens(doc.recipientPlaceholder),
    bodyParagraphs: doc.bodyParagraphs.map(replaceTokens),
    explanationParagraphs: doc.explanationParagraphs.map(replaceTokens),
    legalRemedy: replaceTokens(doc.legalRemedy),
  };
}
