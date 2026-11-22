import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import {
  DomainConfig,
  GeneratedDocument,
  LocalStudentRecord,
  QuotaStatus,
} from '../types';
import { mergeLocalStudentIntoDocument } from '../utils/privacyVault';
import { exportDocumentToWord } from '../utils/wordExport';

interface FormGeneratorViewProps {
  domain: DomainConfig;
  schoolName: string;
  authToken: string;
  localStudents: LocalStudentRecord[];
  onOpenVault: () => void;
  onQuotaUpdate?: (quota: QuotaStatus) => void;
  externalPreset?: { formId: string; values: Record<string, string> } | null;
}

export const FormGeneratorView: React.FC<FormGeneratorViewProps> = ({
  domain,
  schoolName,
  authToken,
  localStudents,
  onOpenVault,
  onQuotaUpdate,
  externalPreset,
}) => {
  const [selectedFormId, setSelectedFormId] = useState<string>(domain.forms[0]?.id ?? '');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const firstForm = domain.forms[0];
    setSelectedFormId(firstForm?.id ?? '');
    setGeneratedDoc(null);
    setSelectedStudentId('');
    setError(null);
    if (firstForm) {
      const defaults: Record<string, string> = {};
      firstForm.fields.forEach((f) => {
        if (f.defaultValue) defaults[f.id] = f.defaultValue;
      });
      setFieldValues(defaults);
    } else {
      setFieldValues({});
    }
  }, [domain.id]);

  useEffect(() => {
    if (externalPreset && domain.forms.some((f) => f.id === externalPreset.formId)) {
      setSelectedFormId(externalPreset.formId);
      setFieldValues(externalPreset.values);
      setGeneratedDoc(null);
    }
  }, [externalPreset, domain.forms]);

  const activeForm = useMemo(
    () => domain.forms.find((f) => f.id === selectedFormId) ?? domain.forms[0],
    [domain.forms, selectedFormId]
  );

  const handleFormChange = (newFormId: string) => {
    setSelectedFormId(newFormId);
    setGeneratedDoc(null);
    setError(null);
    const found = domain.forms.find((f) => f.id === newFormId);
    const defaults: Record<string, string> = {};
    found?.fields.forEach((f) => {
      if (f.defaultValue) defaults[f.id] = f.defaultValue;
    });
    setFieldValues(defaults);
  };

  const handleFillExample = () => {
    if (!activeForm) return;
    const next: Record<string, string> = {};
    activeForm.fields.forEach((f) => {
      if (f.defaultValue) {
        next[f.id] = f.defaultValue;
      } else if (f.options && f.options.length > 0) {
        next[f.id] = f.options[0];
      } else if (f.type === 'date') {
        next[f.id] = new Date().toISOString().slice(0, 10);
      } else {
        next[f.id] = f.placeholder.replace(/^npr\.\s*/i, '');
      }
    });
    setFieldValues(next);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;
    setLoading(true);
    setError(null);

    try {
      const namedInputs: Record<string, string> = {};
      activeForm.fields.forEach((f) => {
        if (fieldValues[f.id]?.trim()) {
          namedInputs[f.label] = fieldValues[f.id].trim();
        }
      });

      const res = await fetch('/api/gemini/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          domainName: domain.name,
          domainContext: domain.systemContext,
          formTitle: activeForm.title,
          legalBasis: activeForm.legalBasis,
          formInputs: namedInputs,
          schoolName,
        }),
      });
      const data = await res.json();
      if (data.quota) onQuotaUpdate?.(data.quota);
      if (!res.ok) {
        throw new Error(data.error || 'Generiranje obrasca nije uspjelo.');
      }
      setGeneratedDoc(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pogreška pri generiranju.');
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = useMemo(
    () => localStudents.find((s) => s.id === selectedStudentId) ?? null,
    [localStudents, selectedStudentId]
  );

  const previewDoc = useMemo(() => {
    if (!generatedDoc) return null;
    return mergeLocalStudentIntoDocument(generatedDoc, selectedStudent);
  }, [generatedDoc, selectedStudent]);

  const handleDownloadWord = async () => {
    if (!previewDoc || !activeForm) return;
    setDownloading(true);
    try {
      await exportDocumentToWord(previewDoc, activeForm.title);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = async () => {
    if (!previewDoc) return;
    const text = [
      previewDoc.schoolHeaderPlaceholder,
      previewDoc.klasaPlaceholder,
      previewDoc.urbrojPlaceholder,
      previewDoc.placeAndDate,
      '',
      previewDoc.recipientPlaceholder,
      '',
      previewDoc.legalBasis,
      '',
      previewDoc.documentTitle,
      '',
      ...previewDoc.bodyParagraphs,
      '',
      previewDoc.explanationParagraphs.length > 0 ? 'Obrazloženje:' : '',
      ...previewDoc.explanationParagraphs,
      '',
      previewDoc.legalRemedy,
      '',
      previewDoc.signatureBlock,
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!activeForm) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Form Selector & Inputs */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Generator službenih obrazaca
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Odaberite predložak, unesite podatke i preuzmite gotovi Word (.docx).
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillExample}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Ispuni primjer</span>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label
              htmlFor="form-template-select"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Padajući izbornik obrazaca ({domain.shortLabel})
            </label>
            <select
              id="form-template-select"
              value={activeForm.id}
              onChange={(e) => handleFormChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              {domain.forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {activeForm.subtitle} · Pravni temelj: {activeForm.legalBasis}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            {activeForm.fields.map((field) => (
              <div key={field.id}>
                <label
                  htmlFor={`field-${field.id}`}
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {field.label}
                  {field.required && <span className="text-red-600 ml-1">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    id={`field-${field.id}`}
                    value={fieldValues[field.id] ?? field.defaultValue ?? ''}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={`field-${field.id}`}
                    rows={3}
                    required={field.required}
                    value={fieldValues[field.id] ?? ''}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                ) : (
                  <input
                    id={`field-${field.id}`}
                    type={field.type}
                    required={field.required}
                    value={fieldValues[field.id] ?? ''}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Generiram službeni akt...' : 'Generiraj obrazac za Word'}</span>
            </button>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>
                U AI zahtjev ne ulaze imena učenika — koriste se sigurne oznake u zagradama.
              </span>
            </p>
          </div>
        </form>
      </div>

      {/* Right: A4 Document Preview & Word Download */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Pregled dokumenta za ispis / Word (.docx)</span>
          </div>

          {previewDoc && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopirano' : 'Kopiraj'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadWord}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'Spremam .docx...' : 'Preuzmi Word (.docx)'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Optional Local-Only Student Merge Bar */}
        {activeForm.supportsLocalStudentMerge && previewDoc && (
          <div className="px-5 py-3 border-b border-slate-200 bg-emerald-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-emerald-950">
              <span className="font-semibold">Lokalno spajanje (samo na uređaju): </span>
              <span>
                {localStudents.length > 0
                  ? 'Odaberite učenika iz lokalnog trezora za automatsko popunjavanje prije preuzimanja.'
                  : 'Možete preuzeti s praznim poljima ili učitati lokalnu tablicu učenika.'}
              </span>
            </div>
            {localStudents.length > 0 ? (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                aria-label="Odaberite učenika iz lokalnog trezora"
                className="px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">-- Ostavi prazne oznake [UČENIK] --</option>
                {localStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.imePrezime} ({st.razred})
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={onOpenVault}
                className="px-3 py-1.5 text-xs font-medium text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Otvori lokalni trezor
              </button>
            )}
          </div>
        )}

        <div className="p-6 sm:p-8 min-h-[520px] bg-slate-50/40">
          {loading ? (
            <div className="space-y-4 animate-pulse max-w-xl mx-auto bg-white border border-slate-200 rounded-lg p-8">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-2/3 mx-auto my-6" />
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-11/12" />
              <div className="h-3 bg-slate-200 rounded w-4/5" />
            </div>
          ) : !previewDoc ? (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
              <FileText className="w-10 h-10 text-slate-300" />
              <h3 className="font-display text-base font-semibold text-slate-900">
                Gotovi Word dokument pojavit će se ovdje
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Odaberite obrazac s lijeve strane i unesite konkretne parametre (npr.{' '}
                <span className="text-slate-700 font-medium">{activeForm.examplePromptHint}</span>).
                Nakon generiranja dokument možete odmah preuzeti kao uređivi <span className="font-mono">.docx</span>.
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              <article className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 text-slate-900 text-sm leading-relaxed space-y-5 font-sans shadow-xs">
                <div className="space-y-1 text-xs text-slate-700 border-b border-slate-200 pb-4">
                  <p className="font-semibold text-slate-900">{previewDoc.schoolHeaderPlaceholder}</p>
                  <p className="font-mono">{previewDoc.klasaPlaceholder}</p>
                  <p className="font-mono">{previewDoc.urbrojPlaceholder}</p>
                  <p>{previewDoc.placeAndDate}</p>
                </div>

                <div className="text-xs text-slate-700 whitespace-pre-line">
                  {previewDoc.recipientPlaceholder}
                </div>

                <p className="text-sm text-slate-800 text-justify">{previewDoc.legalBasis}</p>

                <h3 className="font-display text-base font-bold text-center text-slate-950 tracking-wide py-2">
                  {previewDoc.documentTitle}
                </h3>

                <div className="space-y-3 text-justify">
                  {previewDoc.bodyParagraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>

                {previewDoc.explanationParagraphs.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-center font-semibold text-slate-900 tracking-wide">
                      Obrazloženje
                    </h4>
                    {previewDoc.explanationParagraphs.map((p, i) => (
                      <p key={i} className="text-justify">
                        {p}
                      </p>
                    ))}
                  </div>
                )}

                {previewDoc.legalRemedy && (
                  <div className="pt-2 text-xs text-slate-700 border-t border-slate-100">
                    <span className="font-semibold text-slate-900">Uputa o pravnom lijeku / Napomena: </span>
                    {previewDoc.legalRemedy}
                  </div>
                )}

                <div className="pt-6 text-right whitespace-pre-line text-sm font-medium text-slate-900">
                  {previewDoc.signatureBlock}
                </div>
              </article>

              {previewDoc.complianceNotes.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900">
                    Pravni podsjetnik za djelatnika prije ispisa i potpisa
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                    {previewDoc.complianceNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
