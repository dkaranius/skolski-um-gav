import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  MessageSquareText,
  BookOpen,
  Wrench,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Lock,
  Building2,
  Gauge,
} from 'lucide-react';
import { DOMAINS } from './constants/domains';
import { SCHOOL_PROFILE } from './constants/schoolProfile';
import {
  AdminDocument,
  AuthUser,
  DomainId,
  LocalStudentRecord,
  QuotaStatus,
  RegulationItem,
  WorkspaceTab,
} from './types';
import { computeAnonymizedStats } from './utils/privacyVault';
import { LoginScreen } from './components/LoginScreen';
import { LocalVaultDrawer } from './components/LocalVaultDrawer';
import { SchoolInfoModal } from './components/SchoolInfoModal';
import { AdminQuotaModal } from './components/AdminQuotaModal';
import { FormGeneratorView } from './components/FormGeneratorView';
import { ChatAndReportsView } from './components/ChatAndReportsView';
import { RegulationsLibraryView } from './components/RegulationsLibraryView';
import { DomainSubAppsView } from './components/DomainSubAppsView';

const NAV_TABS: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'obrasci', label: 'Obrasci i Word (.docx)', icon: FileText },
  { id: 'chat', label: 'Chat i izvješća', icon: MessageSquareText },
  { id: 'propisi', label: 'Knjižnica propisa', icon: BookOpen },
  { id: 'alati', label: 'Specijalizirani alati', icon: Wrench },
];

export default function App() {
  // Auth token and user kept strictly in React memory
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('obrasci');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Server-stored Admin-curated documents for the active domain
  const [adminDocs, setAdminDocs] = useState<AdminDocument[]>([]);

  // 100% Client-Side Local Student Vault (never leaves browser RAM)
  const [localStudents, setLocalStudents] = useState<LocalStudentRecord[]>([]);
  const [vaultSourceName, setVaultSourceName] = useState('');
  const [vaultOpen, setVaultOpen] = useState(false);
  const [schoolInfoOpen, setSchoolInfoOpen] = useState(false);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  // Cross-view handoff state
  const [seedQuestion, setSeedQuestion] = useState<string | null>(null);
  const [formPreset, setFormPreset] = useState<{
    formId: string;
    values: Record<string, string>;
  } | null>(null);

  const anonymizedStats = useMemo(
    () => computeAnonymizedStats(localStudents, vaultSourceName),
    [localStudents, vaultSourceName]
  );

  const fetchDomainDocs = useCallback(
    async (token: string, domain: DomainId) => {
      try {
        const res = await fetch(`/api/documents?domain=${encodeURIComponent(domain)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.documents)) {
          setAdminDocs(data.documents);
        }
      } catch {
        // Ignore transient fetch failures
      }
    },
    []
  );

  useEffect(() => {
    if (authToken && user) {
      fetchDomainDocs(authToken, user.activeDomain);
      fetch('/api/quota/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.quota) setQuota(data.quota);
        })
        .catch(() => {
          // Ignore transient quota fetch failures
        });
    } else {
      setAdminDocs([]);
      setQuota(null);
    }
  }, [authToken, user?.activeDomain, fetchDomainDocs]);

  const handleLoginSuccess = (token: string, loggedUser: AuthUser) => {
    setAuthToken(token);
    setUser(loggedUser);
    setActiveTab('obrasci');
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Ignore network errors on logout cleanup
      }
    }
    setAuthToken(null);
    setUser(null);
    setAdminDocs([]);
    setQuota(null);
    setLocalStudents([]);
    setVaultSourceName('');
    setSeedQuestion(null);
    setFormPreset(null);
  };

  const handleSwitchDomain = async (nextDomain: DomainId) => {
    if (!authToken || !user || user.activeDomain === nextDomain) return;
    try {
      const res = await fetch('/api/auth/switch-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ domain: nextDomain }),
      });
      const data = await res.json();
      if (res.ok && data.token && data.user) {
        setAuthToken(data.token);
        setUser(data.user);
        setFormPreset(null);
        setMobileMenuOpen(false);
      }
    } catch {
      setUser({ ...user, activeDomain: nextDomain });
      setMobileMenuOpen(false);
    }
  };

  const handleAskAboutRegulation = (reg: RegulationItem) => {
    setSeedQuestion(
      `Pojasni mi ključne obveze iz propisa "${reg.title}" (${reg.nnReference}) u svakodnevnom radu moje domene.`
    );
    setActiveTab('chat');
  };

  const handleAskAboutAdminDoc = (doc: AdminDocument) => {
    setSeedQuestion(
      `Sažmi najvažnije odredbe i praktične korake iz školskog dokumenta "${doc.name}".`
    );
    setActiveTab('chat');
  };

  const handleJumpToForm = (formId: string, values: Record<string, string>) => {
    setFormPreset({ formId, values });
    setActiveTab('obrasci');
  };

  if (!authToken || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const activeDomain = DOMAINS[user.activeDomain];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar (Desktop + Mobile Overlay) */}
      <aside
        className={`${
          mobileMenuOpen ? 'fixed inset-0 z-40 flex' : 'hidden'
        } lg:static lg:flex lg:w-72 shrink-0 flex-col bg-white border-r border-slate-200`}
      >
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between gap-3">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Školski Um
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900"
            aria-label="Zatvori izbornik"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {/* Domain Switcher */}
          <div className="space-y-2">
            <div className="px-2 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Odabir domene</span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="space-y-1">
              {(Object.keys(DOMAINS) as DomainId[]).map((dId) => {
                const dom = DOMAINS[dId];
                const isActive = dId === user.activeDomain;
                return (
                  <button
                    key={dId}
                    type="button"
                    onClick={() => handleSwitchDomain(dId)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{dom.name}</span>
                    <span
                      className={`font-mono tabular-nums text-[11px] ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {dom.forms.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workspace Module Nav */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <span className="px-2 block text-xs font-semibold text-slate-500">
              Alati domene
            </span>
            <nav className="space-y-1" aria-label="Moduli radnog prostora">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2.5 ${
                      active
                        ? 'bg-blue-50 text-blue-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Quota & Vault Footer */}
        {user.role === 'admin' && (
          <div className="px-4 py-3 border-t border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setQuotaModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Kvote i potrošnja (@skole.hr)</span>
            </button>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs min-w-0">
              <p className="font-semibold text-slate-900">Lokalni trezor učenika</p>
              <p className="text-slate-600 tabular-nums mt-0.5">
                {localStudents.length > 0
                  ? `${localStudents.length} učenika u RAM-u preglednika`
                  : 'Nema učitane tablice'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVaultOpen(true)}
            className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {localStudents.length > 0 ? 'Upravljaj tablicom' : 'Učitaj Excel / CSV lokalno'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: 3 clean zones */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Otvori izbornik"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="font-semibold text-slate-900 whitespace-nowrap">
                {activeDomain.name}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="text-slate-600 truncate">
                {NAV_TABS.find((t) => t.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 whitespace-nowrap shrink-0">
            <span className="font-medium text-slate-800">
              {user.role === 'admin' ? 'Administrator' : 'Djelatnik'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{user.fullName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-700">{user.email}</span>
            {quota && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-700">
                  AI danas: {quota.remainingToday}/{quota.limitToday}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Odjava</span>
            </button>
          </div>
        </header>

        {/* Domain Banner Summary */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-800">{SCHOOL_PROFILE.name}</span>
                <span aria-hidden="true">·</span>
                <span>{SCHOOL_PROFILE.address}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">OIB: {SCHOOL_PROFILE.oib}</span>
              </div>
              <h1 className="font-display text-lg font-semibold text-slate-900">
                {activeDomain.name} — {activeDomain.subAppTitle}
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeDomain.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setSchoolInfoOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Opći podatci škole (gav.hr)</span>
              </button>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {user.role === 'admin'
                    ? 'Admin način · Možete dodavati dokumente'
                    : 'Samo za korištenje'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'obrasci' && (
              <FormGeneratorView
                domain={activeDomain}
                schoolName={user.schoolName}
                authToken={authToken}
                localStudents={localStudents}
                onOpenVault={() => setVaultOpen(true)}
                onQuotaUpdate={setQuota}
                externalPreset={formPreset}
              />
            )}

            {activeTab === 'chat' && (
              <ChatAndReportsView
                domain={activeDomain}
                schoolName={user.schoolName}
                authToken={authToken}
                userRole={user.role}
                adminDocs={adminDocs}
                onRefreshDocs={() => fetchDomainDocs(authToken, user.activeDomain)}
                anonymizedStats={anonymizedStats}
                onOpenVault={() => setVaultOpen(true)}
                onQuotaUpdate={setQuota}
                seedQuestion={seedQuestion}
                onConsumeSeedQuestion={() => setSeedQuestion(null)}
              />
            )}

            {activeTab === 'propisi' && (
              <RegulationsLibraryView
                domain={activeDomain}
                adminDocs={adminDocs}
                onAskAboutRegulation={handleAskAboutRegulation}
                onAskAboutAdminDoc={handleAskAboutAdminDoc}
              />
            )}

            {activeTab === 'alati' && (
              <DomainSubAppsView
                domain={activeDomain}
                schoolName={user.schoolName}
                authToken={authToken}
                anonymizedStats={anonymizedStats}
                onLoadSampleData={(records, label) => {
                  setLocalStudents(records);
                  setVaultSourceName(label);
                }}
                onOpenVault={() => setVaultOpen(true)}
                onQuotaUpdate={setQuota}
                onJumpToForm={handleJumpToForm}
              />
            )}
          </div>
        </main>
      </div>

      <LocalVaultDrawer
        isOpen={vaultOpen}
        onClose={() => setVaultOpen(false)}
        students={localStudents}
        sourceName={vaultSourceName}
        anonymizedStats={anonymizedStats}
        onSetLocalData={(records, label) => {
          setLocalStudents(records);
          setVaultSourceName(label);
        }}
        onClearLocalData={() => {
          setLocalStudents([]);
          setVaultSourceName('');
        }}
      />

      <SchoolInfoModal
        isOpen={schoolInfoOpen}
        onClose={() => setSchoolInfoOpen(false)}
      />

      {user.role === 'admin' && (
        <AdminQuotaModal
          isOpen={quotaModalOpen}
          onClose={() => setQuotaModalOpen(false)}
          authToken={authToken}
          onQuotaUpdated={setQuota}
        />
      )}
    </div>
  );
}
