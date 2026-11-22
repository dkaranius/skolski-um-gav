import React, { useState } from 'react';
import { Building2, Copy, Check, ExternalLink, X, Phone, Mail } from 'lucide-react';
import { SCHOOL_PROFILE } from '../constants/schoolProfile';

interface SchoolInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchoolInfoModal: React.FC<SchoolInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyValue = async (key: string, val: string) => {
    await navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Opći podatci škole"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Building2 className="w-5 h-5 text-blue-700 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-slate-900 truncate">
                {SCHOOL_PROFILE.name}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Opći podatci preuzeti sa službene stranice gav.hr
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
            aria-label="Zatvori prozor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Identifikacijski podatci */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'adresa', label: 'Sjedište i adresa', value: SCHOOL_PROFILE.address },
              { key: 'ravnatelj', label: 'Ravnatelj', value: SCHOOL_PROFILE.principal },
              { key: 'oib', label: 'OIB ustanove', value: SCHOOL_PROFILE.oib, mono: true },
              { key: 'mb', label: 'Matični broj (MB)', value: SCHOOL_PROFILE.maticniBroj, mono: true },
              { key: 'sifra', label: 'Šifra škole', value: SCHOOL_PROFILE.sifraSkole, mono: true },
              { key: 'velicina', label: 'Ustroj', value: `${SCHOOL_PROFILE.studentCountApprox} · ${SCHOOL_PROFILE.staffCountApprox}` },
            ].map((item) => (
              <div
                key={item.key}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-slate-500 block">{item.label}</span>
                  <span
                    className={`font-semibold text-slate-900 mt-0.5 block ${
                      item.mono ? 'font-mono tabular-nums' : ''
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(item.key, item.value)}
                  className="p-1 text-slate-400 hover:text-slate-900 shrink-0"
                  title="Kopiraj"
                >
                  {copiedKey === item.key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Kontakti */}
          <div className="border-t border-slate-200 pt-4 space-y-2.5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Službeni kontakti i poveznice
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Telefoni</span>
                </div>
                <p className="text-slate-600 tabular-nums">
                  Tajništvo / računovodstvo / stručna služba:{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {SCHOOL_PROFILE.phoneSecretariat}
                  </span>
                </p>
                <p className="text-slate-600 tabular-nums">
                  Ravnatelj:{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {SCHOOL_PROFILE.phonePrincipal}
                  </span>
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>E-pošta i web</span>
                </div>
                <p className="text-slate-600 font-mono">
                  {SCHOOL_PROFILE.emailGeneral} · {SCHOOL_PROFILE.emailPrincipal}
                </p>
                <p className="text-slate-600 font-mono">{SCHOOL_PROFILE.emailQuestions}</p>
                <a
                  href={SCHOOL_PROFILE.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 font-medium hover:underline pt-0.5"
                >
                  <span>{SCHOOL_PROFILE.website}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Obrazovni programi */}
          <div className="border-t border-slate-200 pt-4 space-y-2.5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Gimnazijski programi i smjerovi (5 programa)
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 list-disc pl-4 text-slate-700">
              {SCHOOL_PROFILE.programs.map((prog) => (
                <li key={prog} className="font-medium">
                  {prog}
                </li>
              ))}
            </ul>
          </div>

          {/* Kopiranje zaglavlja za Word */}
          <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-slate-500">
              Ovi podatci automatski se ugrađuju u zaglavlja Word (.docx) akata i AI savjetnika.
            </span>
            <button
              type="button"
              onClick={() => copyValue('header', SCHOOL_PROFILE.officialWordHeader)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              {copiedKey === 'header' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedKey === 'header'
                  ? 'Zaglavlje kopirano'
                  : 'Kopiraj službeno zaglavlje'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
