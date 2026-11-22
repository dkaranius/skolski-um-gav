import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  ShieldCheck,
  FileUp,
  Copy,
  Check,
  Download,
  AlertCircle,
  MessageSquareText,
  FileText,
  Eye,
  Trash2,
  ClipboardPaste,
  X,
  Lock,
} from 'lucide-react';
import {
  AdminDocument,
  AnonymizedClassStats,
  ChatMessage,
  DomainConfig,
  DomainId,
  QuotaStatus,
  UserRole,
} from '../types';
import { parseReferenceDocument } from '../utils/documentParser';
import { exportDocumentToWord } from '../utils/wordExport';

interface ChatAndReportsViewProps {
  domain: DomainConfig;
  schoolName: string;
  authToken: string;
  userRole: UserRole;
  adminDocs: AdminDocument[];
  onRefreshDocs: () => Promise<void>;
  anonymizedStats: AnonymizedClassStats | null;
  onOpenVault: () => void;
  onQuotaUpdate?: (quota: QuotaStatus) => void;
  seedQuestion?: string | null;
  onConsumeSeedQuestion?: () => void;
}

export const ChatAndReportsView: React.FC<ChatAndReportsViewProps> = ({
  domain,
  schoolName,
  authToken,
  userRole,
  adminDocs,
  onRefreshDocs,
  anonymizedStats,
  onOpenVault,
  onQuotaUpdate,
  seedQuestion,
  onConsumeSeedQuestion,
}) => {
  const isAdmin = userRole === 'admin';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachStats, setAttachStats] = useState(Boolean(anonymizedStats));
  const [selectedDocIds, setSelectedDocIds] = useState<Record<string, boolean>>({});
  const [uploadScope, setUploadScope] = useState<DomainId | 'all'>(domain.id);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; content: string } | null>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteBody, setPasteBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setUploadScope(domain.id);
    setMessages([
      {
        id: `welcome-${domain.id}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('hr-HR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        content: isAdmin
          ? `Dobrodošli u savjetnika domene ${domain.name} (Administratorski način). S lijeve strane možete dodavati službene dokumente škole (PDF, Word .docx, Excel, TXT) u zajedničku bazu znanja za djelatnike.`
          : `Dobrodošli u savjetnika domene ${domain.name}. Odgovaram na temelju ugrađenih hrvatskih propisa i dokumenata koje je za vašu školu odobrio administrator.`,
      },
    ]);
    setError(null);
  }, [domain.id, domain.name, isAdmin]);

  // Enable newly loaded admin docs by default
  useEffect(() => {
    setSelectedDocIds((prev) => {
      const next = { ...prev };
      for (const d of adminDocs) {
        if (next[d.id] === undefined) {
          next[d.id] = true;
        }
      }
      return next;
    });
  }, [adminDocs]);

  useEffect(() => {
    if (anonymizedStats) {
      setAttachStats(true);
    }
  }, [anonymizedStats]);

  useEffect(() => {
    if (seedQuestion) {
      setInput(seedQuestion);
      onConsumeSeedQuestion?.();
    }
  }, [seedQuestion, onConsumeSeedQuestion]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  const handleAdminUploadFiles = async (files: FileList | File[]) => {
    if (!isAdmin) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setError(null);
    setUploadingFiles(true);
    try {
      for (const file of fileArray) {
        const parsed = await parseReferenceDocument(file, true);
        const res = await fetch('/api/admin/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            name: parsed.name,
            fileType: parsed.fileType,
            domainScope: uploadScope,
            content: parsed.text,
            pageCount: parsed.pageCount,
            piiMaskedCount: parsed.piiMaskedCount,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Spremanje dokumenta "${file.name}" nije uspjelo.`);
        }
      }
      await onRefreshDocs();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Greška pri dodavanju dokumenta.'
      );
    } finally {
      setUploadingFiles(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleAdminPasteText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !pasteBody.trim()) return;
    setError(null);
    setUploadingFiles(true);
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: pasteTitle.trim() || 'Službeni tekst propisa / upute',
          fileType: 'TEKST',
          domainScope: uploadScope,
          content: pasteBody.trim(),
          piiMaskedCount: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Spremanje teksta nije uspjelo.');
      }
      setPasteTitle('');
      setPasteBody('');
      setPasteModalOpen(false);
      await onRefreshDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri spremanju.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteAdminDoc = async (id: string) => {
    if (!isAdmin) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Brisanje nije uspjelo.');
      await onRefreshDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri uklanjanju dokumenta.');
    }
  };

  const handleOpenDocPreview = async (doc: AdminDocument) => {
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(doc.id)}/preview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setPreviewDoc({ name: doc.name, content: data.content });
      }
    } catch {
      setPreviewDoc({ name: doc.name, content: doc.excerpt });
    }
  };

  const activeDocs = adminDocs.filter((d) => selectedDocIds[d.id] !== false);

  const sendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || loading) return;

    const contextLabels: string[] = [];
    if (attachStats && anonymizedStats) {
      contextLabels.push(`Statistika trezora (${anonymizedStats.totalStudents} učenika)`);
    }
    if (activeDocs.length > 0) {
      contextLabels.push(
        `${activeDocs.length} službena dok. (${activeDocs.map((d) => d.name).join(', ')})`
      );
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('hr-HR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      attachedContextLabel:
        contextLabels.length > 0 ? contextLabels.join(' · ') : undefined,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textToSend) setInput('');
    setLoading(true);
    setError(null);

    try {
      const regsSummary = domain.regulations
        .map((r) => `${r.title} (${r.nnReference}): ${r.keyArticles.join('; ')}`)
        .join('\n');

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          domainName: domain.name,
          domainContext: domain.systemContext,
          regulationsSummary: regsSummary,
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          anonymizedStats: attachStats ? anonymizedStats : null,
          selectedDocumentIds: activeDocs.map((d) => d.id),
        }),
      });
      const data = await res.json();
      if (data.quota) onQuotaUpdate?.(data.quota);
      if (!res.ok) {
        throw new Error(data.error || 'Odgovor nije primljen.');
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString('hr-HR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pogreška pri komunikaciji.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReplyWord = async (content: string) => {
    const paragraphs = content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    await exportDocumentToWord(
      {
        documentTitle: `IZVJEŠĆE / STRUČNI SAVJET — ${domain.name.toUpperCase()}`,
        schoolHeaderPlaceholder: schoolName,
        klasaPlaceholder: 'KLASA: [UPISATI KLASU]',
        urbrojPlaceholder: 'URBROJ: [UPISATI URBROJ]',
        placeAndDate: `Datum: ${new Date().toLocaleDateString('hr-HR')}`,
        legalBasis: `Dokument sastavljen uz pomoć knjižnice propisa i odobrenih dokumenata domene ${domain.name}.`,
        recipientPlaceholder: 'Za sjednicu / internu uporabu u ustanovi',
        bodyParagraphs: paragraphs,
        explanationParagraphs: [],
        legalRemedy: '',
        signatureBlock: 'Pripremio/la:\n______________________________',
        complianceNotes: [],
      },
      `Izvjesce_${domain.shortLabel}`
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Context & Documents Panel */}
      <aside className="lg:col-span-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700 shrink-0" />
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Školska baza dokumenata za chat
              </h2>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setPasteModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Zalijepi tekst</span>
              </button>
            )}
          </div>

          {isAdmin ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Vidljivost novog dokumenta
                </label>
                <select
                  value={uploadScope}
                  onChange={(e) => setUploadScope(e.target.value as DomainId | 'all')}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value={domain.id}>Samo za domenu: {domain.name}</option>
                  <option value="all">Sve domene škole (opći akti)</option>
                </select>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.length) {
                    handleAdminUploadFiles(e.dataTransfer.files);
                  }
                }}
                className={`border border-dashed rounded-xl p-4 text-center space-y-2 transition-colors ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/60'
                    : 'border-slate-300 bg-slate-50/70'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files) handleAdminUploadFiles(e.target.files);
                  }}
                  className="hidden"
                />
                <FileUp className="w-5 h-5 text-slate-500 mx-auto" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-800">
                    Admin prijenos dokumenata u bazu znanja
                  </p>
                  <p className="text-[11px] text-slate-500">
                    PDF, Word (.docx), Excel (.xlsx), CSV, TXT
                  </p>
                </div>
                <button
                  type="button"
                  disabled={uploadingFiles}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors"
                >
                  <span>{uploadingFiles ? 'Spremam...' : 'Dodaj dokumente'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Dokumente u školsku bazu mogu dodavati i uklanjati isključivo administratori. Djelatnici mogu koristiti sve dokumente koje je administrator odobrio.
              </p>
            </div>
          )}

          {/* Approved Server Documents List */}
          {adminDocs.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">
              {isAdmin
                ? 'Još nema dodanih dokumenata za ovu domenu. Ubacite PDF ili Word datoteku iznad.'
                : 'Administrator još nije dodao dodatne školske dokumente za ovu domenu; chat koristi ugrađene zakone i pravilnike.'}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Aktivno u chatu: <strong className="text-slate-900">{activeDocs.length}</strong> od{' '}
                  {adminDocs.length}
                </span>
                <span className="tabular-nums font-mono">
                  {activeDocs
                    .reduce((acc, d) => acc + d.charCount, 0)
                    .toLocaleString('hr-HR')}{' '}
                  zn.
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {adminDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-start justify-between gap-2 text-xs"
                  >
                    <label className="flex items-start gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={selectedDocIds[doc.id] !== false}
                        onChange={(e) =>
                          setSelectedDocIds((prev) => ({
                            ...prev,
                            [doc.id]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {doc.fileType}
                          {doc.pageCount ? ` · ${doc.pageCount} str.` : ''} ·{' '}
                          {doc.domainScope === 'all' ? 'Sve domene' : 'Domena'}
                        </p>
                      </div>
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDocPreview(doc)}
                        title="Pregledaj izvučeni tekst"
                        aria-label="Pregledaj tekst dokumenta"
                        className="p-1 text-slate-400 hover:text-blue-700 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAdminDoc(doc.id)}
                          title="Ukloni dokument iz baze (Admin)"
                          aria-label="Ukloni dokument"
                          className="p-1 text-slate-400 hover:text-red-700 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Local Vault Anonymized Stats Toggle */}
          <div className="border-t border-slate-100 pt-3 text-xs">
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer">
              <input
                type="checkbox"
                checked={attachStats && Boolean(anonymizedStats)}
                disabled={!anonymizedStats}
                onChange={(e) => setAttachStats(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <div className="space-y-1">
                <span className="font-medium text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Anonimizirana statistika iz trezora</span>
                </span>
                {anonymizedStats ? (
                  <span className="text-slate-600 block tabular-nums">
                    Uključeno: {anonymizedStats.totalStudents} učenika · prosjek{' '}
                    {anonymizedStats.overallAvgGrade.toFixed(2)} · 0 imena
                  </span>
                ) : (
                  <span className="text-slate-500 block">
                    Tablica učenika nije učitana.{' '}
                    <button
                      type="button"
                      onClick={onOpenVault}
                      className="text-blue-700 underline hover:text-blue-800"
                    >
                      Otvori lokalni trezor
                    </button>
                  </span>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Brzi zadatci za domenu
          </h3>
          <div className="space-y-2">
            {domain.quickChatPrompts.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(promptText)}
                disabled={loading}
                className="w-full text-left p-2.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors leading-relaxed"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Right Chat Stream */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col h-[680px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquareText className="w-4 h-4 text-blue-700" />
            <span>Pravni savjetnik i sastavljač izvješća ({domain.shortLabel})</span>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap tabular-nums">
            {domain.regulations.length} ugrađenih propisa · {activeDocs.length} odobrenih dok.
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-900'
                }`}
              >
                {msg.attachedContextLabel && (
                  <p className="text-xs text-blue-200 mb-1.5 pb-1.5 border-b border-slate-700">
                    Izvori: {msg.attachedContextLabel}
                  </p>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              <div className="flex items-center gap-3 mt-1.5 px-1 text-xs text-slate-500">
                <span className="tabular-nums">{msg.timestamp}</span>
                {msg.role === 'assistant' && !msg.id.startsWith('welcome-') && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(msg.content);
                        setCopiedId(msg.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-700" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === msg.id ? 'Kopirano' : 'Kopiraj'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportReplyWord(msg.content)}
                      className="inline-flex items-center gap-1 hover:text-blue-700 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Spremi u Word (.docx)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600">
                Analiziram odobrene dokumente i propise te pripremam odgovor...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-2 flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 border-t border-slate-200 bg-white flex items-end gap-3"
        >
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Postavite pitanje prema odobrenim dokumentima i propisima ili zatražite izvješće..."
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 h-[44px]"
          >
            <Send className="w-4 h-4" />
            <span>Pošalji</span>
          </button>
        </form>
      </div>

      {/* Document Text Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-slate-900 truncate">
                  {previewDoc.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Sadržaj dokumenta iz školske baze znanja
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                aria-label="Zatvori pregled"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-slate-700 leading-relaxed bg-slate-50">
              {previewDoc.content}
            </div>
          </div>
        </div>
      )}

      {/* Admin Paste Raw Text Modal */}
      {isAdmin && pasteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleAdminPasteText}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Dodaj tekst propisa ili dokumenta (Admin)
              </h3>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Naziv dokumenta
              </label>
              <input
                type="text"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="npr. Statut škole — izvadak o vijećima"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sadržaj teksta
              </label>
              <textarea
                rows={7}
                required
                value={pasteBody}
                onChange={(e) => setPasteBody(e.target.value)}
                placeholder="Zalijepite članke pravilnika, dopis ministarstva ili školski akt..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Odustani
              </button>
              <button
                type="submit"
                disabled={uploadingFiles}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                {uploadingFiles ? 'Spremam...' : 'Spremi u bazu znanja'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
