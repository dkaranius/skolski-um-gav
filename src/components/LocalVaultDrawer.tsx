import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  Upload,
  Download,
  Trash2,
  Eye,
  Lock,
  FileSpreadsheet,
  X,
  Database,
} from 'lucide-react';
import { SAMPLE_LOCAL_STUDENTS } from '../constants/domains';
import { AnonymizedClassStats, LocalStudentRecord } from '../types';
import {
  downloadSampleTemplateXlsx,
  parseStudentSpreadsheetLocally,
} from '../utils/privacyVault';

interface LocalVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  students: LocalStudentRecord[];
  sourceName: string;
  anonymizedStats: AnonymizedClassStats | null;
  onSetLocalData: (records: LocalStudentRecord[], sourceLabel: string) => void;
  onClearLocalData: () => void;
}

export const LocalVaultDrawer: React.FC<LocalVaultDrawerProps> = ({
  isOpen,
  onClose,
  students,
  sourceName,
  anonymizedStats,
  onSetLocalData,
  onClearLocalData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'local' | 'anonymized'>('local');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseStudentSpreadsheetLocally(file);
      onSetLocalData(parsed, file.name);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nije moguće pročitati tablicu. Provjerite format (.xlsx, .xls, .csv).'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Lokalni trezor podataka učenika"
    >
      <div className="w-full max-w-3xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-slate-900 truncate">
                Lokalni trezor učenika (100% u memoriji preglednika)
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Imena, roditelji i pojedinačni redci nikada ne napuštaju vaše računalo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Zatvori trezor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-900">
                  Učitajte tablicu s popisom učenika (.xlsx, .xls, .csv)
                </p>
                <p className="text-xs text-slate-600">
                  Obrađuje se izravno u pregledniku pomoću lokalnog parsera. Ništa se ne šalje na poslužitelj.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Učitaj Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSetLocalData(SAMPLE_LOCAL_STUDENTS, 'Ogledni_eDnevnik_3ab.xlsx')
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Učitaj oglednu tablicu</span>
                </button>
                <button
                  type="button"
                  onClick={downloadSampleTemplateXlsx}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Preuzmi predložak .xlsx</span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {students.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center space-y-3">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  Trenutno nema učitanih podataka u lokalnoj memoriji
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Učitajte izvoz iz e-Dnevnika kako biste mogli automatski puniti obrasce u Wordu bez slanja imena na internet te generirati anonimizirana izvješća i PowerPoint dijagrame.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('local')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      viewMode === 'local'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Lokalna tablica ({students.length} učenika)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('anonymized')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      viewMode === 'anonymized'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Što vidi AI (0 osobnih podataka)
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="truncate max-w-[200px]">Izvor: {sourceName}</span>
                  <button
                    type="button"
                    onClick={onClearLocalData}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Isprazni RAM</span>
                  </button>
                </div>
              </div>

              {viewMode === 'local' ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-slate-200 flex items-center gap-2 text-xs text-emerald-900">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Zaštićeni lokalni pregled — ovi podatci služe isključivo za spajanje u Wordu na vašem uređaju.
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Ime i prezime</th>
                          <th className="py-2.5 px-3 font-semibold">Razred</th>
                          <th className="py-2.5 px-3 font-semibold">Roditelj</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Prosjek</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Opravd.</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Neopravd.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {st.imePrezime}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{st.razred}</td>
                            <td className="py-2 px-3 text-slate-600">{st.roditelj}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900">
                              {st.prosjekOcjena.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                              {st.opravdaniSati}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-red-700 font-medium">
                              {st.neopravdaniSati}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Eye className="w-4 h-4 text-blue-700" />
                    <span>
                      Jedini podatci koji se smiju poslati AI asistentu pri izradi izvješća i PPTX-a:
                    </span>
                  </div>
                  <pre className="text-xs font-mono bg-white border border-slate-200 rounded-lg p-3.5 overflow-x-auto text-slate-800 leading-relaxed">
                    {JSON.stringify(anonymizedStats, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
