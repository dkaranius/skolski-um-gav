import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  Presentation,
  Download,
  Sparkles,
  Database,
  AlertCircle,
  CalendarClock,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { SAMPLE_LOCAL_STUDENTS } from '../constants/domains';
import {
  AnonymizedClassStats,
  DomainConfig,
  GeneratedPresentation,
  LocalStudentRecord,
  QuotaStatus,
} from '../types';
import { exportPresentationToPptx } from '../utils/pptxExport';

interface DomainSubAppsViewProps {
  domain: DomainConfig;
  schoolName: string;
  authToken: string;
  anonymizedStats: AnonymizedClassStats | null;
  onLoadSampleData: (records: LocalStudentRecord[], label: string) => void;
  onOpenVault: () => void;
  onQuotaUpdate?: (quota: QuotaStatus) => void;
  onJumpToForm: (formId: string, values: Record<string, string>) => void;
}

interface EmploymentPeriod {
  id: string;
  employer: string;
  startDate: string;
  endDate: string;
  ftePercent: number;
}

function diffDays30(startIso: string, endIso: string): number {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  // Standard Croatian administrative 30-day month / 360-day year calculation
  const sy = s.getFullYear();
  const sm = s.getMonth() + 1;
  const sd = Math.min(30, s.getDate());
  const ey = e.getFullYear();
  const em = e.getMonth() + 1;
  const ed = Math.min(30, e.getDate());
  return (ey - sy) * 360 + (em - sm) * 30 + (ed - sd) + 1;
}

const JUBILEE_MILESTONES = [5, 10, 15, 20, 25, 30, 35, 40, 45];

export const DomainSubAppsView: React.FC<DomainSubAppsViewProps> = ({
  domain,
  schoolName,
  authToken,
  anonymizedStats,
  onLoadSampleData,
  onOpenVault,
  onQuotaUpdate,
  onJumpToForm,
}) => {
  // === 1. TAJNIŠTVO: Kalkulator staža ===
  const [periods, setPeriods] = useState<EmploymentPeriod[]>([
    {
      id: 'p-1',
      employer: 'Prethodna osnovna škola',
      startDate: '2014-09-01',
      endDate: '2019-08-31',
      ftePercent: 100,
    },
    {
      id: 'p-2',
      employer: 'Trenutna škola',
      startDate: '2019-09-01',
      endDate: new Date().toISOString().slice(0, 10),
      ftePercent: 100,
    },
  ]);

  const tenureSummary = useMemo(() => {
    let totalEffectiveDays = 0;
    const perRow = periods.map((p) => {
      const rawDays = diffDays30(p.startDate, p.endDate);
      const ratio = Math.min(100, Math.max(1, Number(p.ftePercent) || 100)) / 100;
      const effDays = Math.round(rawDays * ratio);
      totalEffectiveDays += effDays;
      return { id: p.id, effDays };
    });

    const years = Math.floor(totalEffectiveDays / 360);
    const remAfterYears = totalEffectiveDays % 360;
    const months = Math.floor(remAfterYears / 30);
    const days = remAfterYears % 30;
    const bonusPercent = Number((years * 0.5).toFixed(1));
    const nextMilestone = JUBILEE_MILESTONES.find((m) => m > years) ?? null;
    const daysToNext = nextMilestone ? nextMilestone * 360 - totalEffectiveDays : 0;

    return {
      perRow,
      totalEffectiveDays,
      years,
      months,
      days,
      bonusPercent,
      nextMilestone,
      daysToNext,
    };
  }, [periods]);

  // === 2. STRUČNI SURADNICI & NASTAVNICI: PPTX & Chart Generator ===
  const defaultGoal =
    domain.id === 'nastavnici'
      ? 'Prezentacija za roditeljski sastanak: opći uspjeh, izostanci i plan aktivnosti'
      : 'Analiza rezultata odgojno-obrazovnog uspjeha, izostanaka i mature za sjednicu NV-a';

  const defaultAudience =
    domain.id === 'nastavnici' ? 'Roditelji učenika razrednog odjela' : 'Nastavničko vijeće';

  const [pptGoal, setPptGoal] = useState(defaultGoal);
  const [pptAudience, setPptAudience] = useState(defaultAudience);
  const [pptNotes, setPptNotes] = useState('');
  const [deck, setDeck] = useState<GeneratedPresentation | null>(null);
  const [pptLoading, setPptLoading] = useState(false);
  const [pptError, setPptError] = useState<string | null>(null);
  const [exportingPptx, setExportingPptx] = useState(false);

  // === 3. RAVNATELJ: Organizator sjednice NV/UV ===
  const [meetingType, setMeetingType] = useState('Nastavničko vijeće');
  const [meetingDate, setMeetingDate] = useState('2026-12-15T13:15');
  const [agendaItems, setAgendaItems] = useState<string[]>([
    'Usvajanje zapisnika s prethodne sjednice',
    'Analiza odgojno-obrazovnog uspjeha i izostanaka učenika',
    'Izricanje pedagoških mjera iz nadležnosti Vijeća',
    'Odobrenje izleta i terenske nastave',
    'Razno',
  ]);
  const [newAgendaItem, setNewAgendaItem] = useState('');

  const handleGeneratePptxDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    setPptLoading(true);
    setPptError(null);
    try {
      const res = await fetch('/api/gemini/generate-pptx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          domainName: domain.name,
          presentationGoal: pptGoal,
          audience: pptAudience,
          anonymizedStats,
          customNotes: pptNotes,
        }),
      });
      const data = await res.json();
      if (data.quota) onQuotaUpdate?.(data.quota);
      if (!res.ok) throw new Error(data.error || 'Generiranje prezentacije nije uspjelo.');
      setDeck(data.presentation);
    } catch (err) {
      setPptError(err instanceof Error ? err.message : 'Pogreška pri generiranju.');
    } finally {
      setPptLoading(false);
    }
  };

  if (domain.id === 'tajnistvo_racunovodstvo') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calculator className="w-5 h-5 text-blue-700" />
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Kalkulator radnog staža i jubilarnih nagrada djelatnika
                </h2>
                <p className="text-xs text-slate-500">
                  Obračun po 30-dnevnom mjesecu (360 dana/god.) uz uračunavanje postotka radnog vremena.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setPeriods((prev) => [
                  ...prev,
                  {
                    id: `p-${Date.now()}`,
                    employer: 'Novo razdoblje rada',
                    startDate: '2024-01-01',
                    endDate: new Date().toISOString().slice(0, 10),
                    ftePercent: 100,
                  },
                ])
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj razdoblje</span>
            </button>
          </div>

          <div className="space-y-3">
            {periods.map((p, idx) => {
              const eff = tenureSummary.perRow.find((r) => r.id === p.id)?.effDays ?? 0;
              const y = Math.floor(eff / 360);
              const m = Math.floor((eff % 360) / 30);
              const d = eff % 30;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-xs text-slate-600 mb-1">
                      Poslodavac / ustanova #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={p.employer}
                      onChange={(e) =>
                        setPeriods((prev) =>
                          prev.map((item) =>
                            item.id === p.id ? { ...item, employer: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-slate-600 mb-1">Od datuma</label>
                    <input
                      type="date"
                      value={p.startDate}
                      onChange={(e) =>
                        setPeriods((prev) =>
                          prev.map((item) =>
                            item.id === p.id ? { ...item, startDate: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-slate-600 mb-1">Do datuma</label>
                    <input
                      type="date"
                      value={p.endDate}
                      onChange={(e) =>
                        setPeriods((prev) =>
                          prev.map((item) =>
                            item.id === p.id ? { ...item, endDate: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs text-slate-600 mb-1">% rad.</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={p.ftePercent}
                      onChange={(e) =>
                        setPeriods((prev) =>
                          prev.map((item) =>
                            item.id === p.id
                              ? { ...item, ftePercent: Number(e.target.value) }
                              : item
                          )
                        )
                      }
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums text-right"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={periods.length <= 1}
                      onClick={() =>
                        setPeriods((prev) => prev.filter((item) => item.id !== p.id))
                      }
                      aria-label="Ukloni redak"
                      className="p-2 text-slate-400 hover:text-red-700 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="sm:col-span-12 text-xs text-slate-500 font-mono tabular-nums">
                    Priznati staž u ovom razdoblju: {y} god. · {m} mj. · {d} dana
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Ukupni obračun staža i prava po TKU
            </h3>
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-1">
              <span className="text-xs text-slate-300">Ukupno priznati radni staž</span>
              <p className="font-display text-2xl font-bold font-mono tabular-nums">
                {tenureSummary.years} god · {tenureSummary.months} mj · {tenureSummary.days} d
              </p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Dodatak na plaću (0,5% / god.)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  +{tenureSummary.bonusPercent.toFixed(1)}%
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Sljedeća jubilarna nagrada</span>
                <span className="font-mono font-semibold text-blue-700 tabular-nums">
                  {tenureSummary.nextMilestone
                    ? `${tenureSummary.nextMilestone} godina`
                    : 'Ostvareni svi pragovi'}
                </span>
              </div>
              {tenureSummary.nextMilestone && (
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600">Preostalo do jubilarne</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {Math.floor(tenureSummary.daysToNext / 360)} god ·{' '}
                    {Math.floor((tenureSummary.daysToNext % 360) / 30)} mj ·{' '}
                    {tenureSummary.daysToNext % 30} d
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-medium text-slate-700">
                Pragovi jubilarnih nagrada (TKU):
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-mono tabular-nums">
                {JUBILEE_MILESTONES.map((m) => {
                  const reached = tenureSummary.years >= m;
                  return (
                    <div
                      key={m}
                      className={`px-2 py-1 rounded text-center border ${
                        reached
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      {m} god.
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Brzi prijelaz u računovodstvene obrasce
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pripremite prijedlog ili izvješće o izvršenju financijskog plana za Školski odbor u Wordu.
            </p>
            <button
              type="button"
              onClick={() =>
                onJumpToForm('izvjesce_financijski_plan', {
                  razdobljeIzvjesca: '1. siječnja – 30. rujna 2026.',
                  kljucniBrojevi:
                    'Planirani prihodi 450.000 EUR, ostvareno 338.500 EUR (75,2%). Rashodi za zaposlene i materijalni troškovi u okviru plana.',
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Otvori Obrazac financijskog plana</span>
            </button>
          </div>
        </aside>
      </div>
    );
  }

  if (domain.id === 'ravnatelj') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Organizator sjednice NV / UV i paketa odluka
              </h2>
              <p className="text-xs text-slate-500">
                Složite točke dnevnog reda i jednim klikom pripremite službeni Poziv u Wordu.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Vrsta kolegijalnog tijela
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="Nastavničko vijeće">Nastavničko vijeće</option>
                <option value="Učiteljsko vijeće">Učiteljsko vijeće</option>
                <option value="Izvanredna sjednica Vijeća">Izvanredna sjednica Vijeća</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Datum i vrijeme održavanja
              </label>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="block text-xs font-medium text-slate-700">
              Točke dnevnog reda ({agendaItems.length})
            </span>
            <div className="space-y-2">
              {agendaItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <span className="text-slate-900 font-medium">
                    <span className="font-mono text-slate-500 mr-2">{idx + 1}.</span>
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAgendaItems((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-slate-400 hover:text-red-700 transition-colors"
                    aria-label="Ukloni točku"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newAgendaItem}
                onChange={(e) => setNewAgendaItem(e.target.value)}
                placeholder="Dodaj novu točku dnevnog reda..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newAgendaItem.trim()) return;
                  setAgendaItems((prev) => [...prev, newAgendaItem.trim()]);
                  setNewAgendaItem('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const formattedAgenda = agendaItems
                  .map((it, idx) => `${idx + 1}. ${it}`)
                  .join('\n');
                onJumpToForm('poziv_nv', {
                  vrstaVijeca: meetingType,
                  terminIMjesto: `${meetingDate.replace('T', ' u ')} sati, zbornica škole`,
                  tockeDnevnogReda: formattedAgenda,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <span>Pripremi Poziv na sjednicu u Word generatoru</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Statutarni podsjetnik za pravovaljanost sjednice
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
            <li>
              Kvorum: sjednica je pravovaljana ako je nazočna natpolovična većina svih članova Nastavničkog/Učiteljskog vijeća.
            </li>
            <li>
              Odlučivanje: odluke se donose većinom glasova nazočnih članova, osim ako Statut za pojedinu odluku ne propisuje natpolovičnu većinu ukupnog broja članova.
            </li>
            <li>
              Rok dostave poziva: u pravilu najmanje 3 do 5 dana prije održavanja redovne sjednice s priloženim materijalima.
            </li>
          </ul>
        </aside>
      </div>
    );
  }

  // === 3. STRUČNI SURADNICI & NASTAVNICI: Charts + PPTX Generator ===
  const gradeBars = anonymizedStats
    ? [
        { label: 'Odličan (5)', value: anonymizedStats.gradeDistribution.odlican, color: '#1D4ED8' },
        { label: 'Vrlo dobar (4)', value: anonymizedStats.gradeDistribution.vrloDobar, color: '#2563EB' },
        { label: 'Dobar (3)', value: anonymizedStats.gradeDistribution.dobar, color: '#475569' },
        { label: 'Dovoljan (2)', value: anonymizedStats.gradeDistribution.dovoljan, color: '#D97706' },
        { label: 'Nedovoljan (1)', value: anonymizedStats.gradeDistribution.nedovoljan, color: '#DC2626' },
      ]
    : [];
  const maxGradeCount = Math.max(1, ...gradeBars.map((b) => b.value));

  return (
    <div className="space-y-6">
      {/* Live Anonymized Charts Row */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Vizualna analiza uspjeha i izostanaka (anonimizirano)
            </h2>
            <p className="text-xs text-slate-500">
              Dijagrami se generiraju isključivo iz zbrojnih podataka lokalno učitane tablice.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!anonymizedStats && (
              <button
                type="button"
                onClick={() =>
                  onLoadSampleData(SAMPLE_LOCAL_STUDENTS, 'Ogledni_eDnevnik_3ab.xlsx')
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Učitaj oglednu tablicu</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenVault}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>{anonymizedStats ? 'Uredi / zamijeni Excel' : 'Učitaj vlastiti Excel'}</span>
            </button>
          </div>
        </div>

        {!anonymizedStats ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              Učitajte tablicu iz e-Dnevnika za prikaz jasnih dijagrama
            </p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Podatci ostaju isključivo u vašem pregledniku; za PPTX prezentaciju koriste se samo brojčani zbrojevi po ocjenama i razredima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700">
                Raspodjela općeg uspjeha ({anonymizedStats.totalStudents} učenika · prosjek{' '}
                <span className="font-mono tabular-nums">
                  {anonymizedStats.overallAvgGrade.toFixed(2)}
                </span>
                )
              </h3>
              <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                {gradeBars.map((bar) => {
                  const pct = Math.round((bar.value / maxGradeCount) * 100);
                  return (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-medium">{bar.label}</span>
                        <span className="font-mono tabular-nums text-slate-900 font-semibold">
                          {bar.value} učenika
                        </span>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all"
                          style={{ width: `${pct}%`, backgroundColor: bar.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700">
                Pregled po razrednim odjelima (prosjek ocjena i izostanci)
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Razred</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Učenika</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Prosjek</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Pr. opravd.</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Pr. neopravd.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {anonymizedStats.classBreakdown.map((c) => (
                      <tr key={c.razred}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{c.razred}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {c.count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                          {c.avgGrade.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                          {c.avgJustifiedAbsences}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700 font-medium">
                          {c.avgUnjustifiedAbsences}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PPTX Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGeneratePptxDeck}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-blue-700" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Generator PowerPoint (.pptx) prezentacije
            </h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tema / cilj prezentacije
            </label>
            <input
              type="text"
              required
              value={pptGoal}
              onChange={(e) => setPptGoal(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Publika (za prilagodbu tona slajdova)
            </label>
            <input
              type="text"
              value={pptAudience}
              onChange={(e) => setPptAudience(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Dodatne napomene ili zaključci za uključiti (opcionalno)
            </label>
            <textarea
              rows={3}
              value={pptNotes}
              onChange={(e) => setPptNotes(e.target.value)}
              placeholder="npr. Istaknuti uspjeh na državnoj maturi iz Matematike i plan dopunske nastave u 2. polugodištu."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          {pptError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pptError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pptLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>{pptLoading ? 'Pripremam slajdove...' : 'Generiraj nacrt prezentacije'}</span>
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4 min-h-[380px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                {deck ? deck.deckTitle : 'Pregled generiranih slajdova'}
              </h3>
              <p className="text-xs text-slate-500">
                {deck
                  ? `${deck.slides.length} slajdova · Ugrađeni izvorni PowerPoint grafikoni`
                  : 'Nakon generiranja možete preuzeti gotovi .pptx dokument.'}
              </p>
            </div>
            {deck && (
              <button
                type="button"
                disabled={exportingPptx}
                onClick={async () => {
                  setExportingPptx(true);
                  try {
                    await exportPresentationToPptx(deck, anonymizedStats, schoolName);
                  } finally {
                    setExportingPptx(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportingPptx ? 'Izvozim .pptx...' : 'Preuzmi PowerPoint (.pptx)'}</span>
              </button>
            )}
          </div>

          {!deck ? (
            <div className="py-16 text-center space-y-2">
              <Presentation className="w-9 h-9 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sustav će automatski povezati zbrojne brojke iz vašeg Lokalnog trezora s AI sažetcima i izraditi gotove slajdove za sjednicu ili roditeljski sastanak.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {deck.slides.map((s, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50/70 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                      Slajd {idx + 1} · {s.layout}
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-semibold text-slate-900">
                    {s.title}
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">
                    {s.bullets.map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                  {s.speakerNotes && (
                    <p className="text-xs text-slate-500 pt-1.5 border-t border-slate-200">
                      Bilješka za govornika: {s.speakerNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
