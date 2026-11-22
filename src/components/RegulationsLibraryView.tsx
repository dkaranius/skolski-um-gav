import React, { useMemo, useState } from 'react';
import { BookOpen, Lock, Search, MessageSquareText, FileText } from 'lucide-react';
import { DOMAINS } from '../constants/domains';
import { AdminDocument, DomainConfig, DomainId, RegulationItem } from '../types';

interface RegulationsLibraryViewProps {
  domain: DomainConfig;
  adminDocs: AdminDocument[];
  onAskAboutRegulation: (reg: RegulationItem) => void;
  onAskAboutAdminDoc: (doc: AdminDocument) => void;
}

export const RegulationsLibraryView: React.FC<RegulationsLibraryViewProps> = ({
  domain,
  adminDocs,
  onAskAboutRegulation,
  onAskAboutAdminDoc,
}) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'domain' | 'all'>('domain');

  const items = useMemo(() => {
    const base: Array<RegulationItem & { domainLabel: string }> =
      scope === 'domain'
        ? domain.regulations.map((r) => ({ ...r, domainLabel: domain.shortLabel }))
        : (Object.keys(DOMAINS) as DomainId[]).flatMap((id) =>
            DOMAINS[id].regulations.map((r) => ({
              ...r,
              domainLabel: DOMAINS[id].shortLabel,
            }))
          );

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.shortName.toLowerCase().includes(q) ||
        item.nnReference.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.keyArticles.some((a) => a.toLowerCase().includes(q))
    );
  }, [domain, query, scope]);

  const filteredAdminDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return adminDocs;
    return adminDocs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.excerpt.toLowerCase().includes(q)
    );
  }, [adminDocs, query]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-700" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Knjižnica pročišćenih zakona, pravilnika i školskih akata
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Temeljni propisi zaštićeni su od brisanja; dodatne školske dokumente unosi isključivo administrator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setScope('domain')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                scope === 'domain'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Domena: {domain.shortLabel}
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                scope === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Svi školski propisi
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretraži zakone, članke, akte..."
              className="pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {filteredAdminDocs.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Dodatni dokumenti škole (odobrio administrator)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAdminDocs.map((doc) => (
              <article
                key={doc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    <span>{doc.fileType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{doc.domainScope === 'all' ? 'Sve domene' : domain.shortLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>Dodao: {doc.uploadedBy}</span>
                  </div>
                  <h4 className="font-display text-sm font-semibold text-slate-900">
                    {doc.name}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {doc.excerpt}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 tabular-nums">
                    {doc.charCount.toLocaleString('hr-HR')} znakova
                  </span>
                  <button
                    type="button"
                    onClick={() => onAskAboutAdminDoc(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <MessageSquareText className="w-3.5 h-3.5" />
                    <span>Pitaj savjetnika</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-900">
            Nema propisa koji odgovaraju traženom pojmu
          </p>
          <p className="text-xs text-slate-500">
            Pokušajte s drugim ključnim riječima ili proširite pretragu na sve domene.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((reg) => (
            <article
              key={`${reg.domainLabel}-${reg.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{reg.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{reg.domainLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-600">{reg.nnReference}</span>
                </div>

                <h3 className="font-display text-base font-semibold text-slate-900 leading-snug">
                  {reg.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">{reg.summary}</p>

                <div className="border-t border-slate-100 pt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-800">
                    Ključne odredbe za praksu:
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                    {reg.keyArticles.map((art, i) => (
                      <li key={i}>{art}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Samo za čitanje</span>
                </span>
                <button
                  type="button"
                  onClick={() => onAskAboutRegulation(reg)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <MessageSquareText className="w-3.5 h-3.5" />
                  <span>Pitaj savjetnika</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
