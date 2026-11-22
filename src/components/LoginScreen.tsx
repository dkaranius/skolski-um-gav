import React, { useEffect, useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Building2,
  ChevronRight,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { DOMAINS } from '../constants/domains';
import { SCHOOL_PROFILE } from '../constants/schoolProfile';
import { AuthUser, DomainId } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('denis.karanusic@skole.hr');
  const [fullName, setFullName] = useState('Denis Karanušić');
  const [schoolName, setSchoolName] = useState<string>(SCHOOL_PROFILE.fullHeaderName);
  const [selectedDomain, setSelectedDomain] = useState<DomainId>('strucni_suradnici');
  const [loginMode, setLoginMode] = useState<'user' | 'admin'>('user');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminStatus, setAdminStatus] = useState<{
    isClaimed: boolean;
    envPasscodeConfigured: boolean;
  }>({ isClaimed: true, envPasscodeConfigured: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/admin-status')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.isClaimed === 'boolean') {
          setAdminStatus({
            isClaimed: data.isClaimed,
            envPasscodeConfigured: Boolean(data.envPasscodeConfigured),
          });
        }
      })
      .catch(() => {
        // Ignore initial status check errors
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@([a-z0-9-]+\.)*skole\.hr$/i.test(email.trim())) {
      setError('Prijava je dopuštena isključivo s važećom @skole.hr adresom e-pošte.');
      return;
    }

    setLoading(true);
    try {
      const isAdmin = loginMode === 'admin';

      // First-run atomic admin claim if no ADMIN_PASSCODE is set and not yet claimed
      if (isAdmin && !adminStatus.isClaimed && !adminStatus.envPasscodeConfigured) {
        if (adminPassword.length < 8) {
          throw new Error('Prva administratorska lozinka mora imati najmanje 8 znakova.');
        }
        const claimRes = await fetch('/api/auth/claim-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            adminPassword,
          }),
        });
        const claimData = await claimRes.json();
        if (!claimRes.ok) {
          throw new Error(claimData.error || 'Postavljanje administratorske lozinke nije uspjelo.');
        }
        setAdminStatus({ isClaimed: true, envPasscodeConfigured: false });
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          schoolName: schoolName.trim(),
          domain: selectedDomain,
          loginAsAdmin: isAdmin,
          adminPassword: isAdmin ? adminPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Prijava nije uspjela.');
      }
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pogreška pri povezivanju s poslužiteljem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Školski Um
          </span>
          <span className="text-sm text-slate-500 hidden sm:inline whitespace-nowrap">
            CARNET @skole.hr pristup · Neovisna školska administracija
          </span>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <section className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-blue-700 tracking-wide">
              {SCHOOL_PROFILE.name} · {SCHOOL_PROFILE.address}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance leading-tight">
              Jedinstveni mozak škole za propise, obrasce i izvješća
            </h1>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              OIB: {SCHOOL_PROFILE.oib} · MB: {SCHOOL_PROFILE.maticniBroj} · Ravnatelj: {SCHOOL_PROFILE.principal} · {SCHOOL_PROFILE.website}
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              Prijavite se sa svojim <span className="font-mono text-slate-800">@skole.hr</span> podacima. Djelatnici koriste bazu znanja, obrasce i alate, dok isključivo administratori mogu dodavati službene dokumente u zajedničku knjižnicu.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Potpuna lokalna zaštita podataka učenika
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tablice s popisom učenika (e-Dnevnik, ocjene, izostanci) učitavaju se isključivo u radnu memoriju vašeg preglednika i nikada se ne šalju na internet.
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Administratorska kontrola dokumenata
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Samo ovlašteni administrator škole dodaje pravilnike, statut i kurikulume u bazu znanja za chat. Ostali korisnici ne mogu mijenjati niti brisati dokumente.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  Prijava sa @skole.hr računom
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Odaberite vrstu pristupa i svoju radnu domenu.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('user');
                    setError(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    loginMode === 'user'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Djelatnik škole
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('admin');
                    setError(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    loginMode === 'admin'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Administrator
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Adresa e-pošte (@skole.hr)
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ime.prezime@skole.hr"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="login-name"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Ime i prezime djelatnika
                </label>
                <input
                  id="login-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ime i prezime"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            {loginMode === 'admin' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <KeyRound className="w-4 h-4 text-blue-700" />
                  <span>
                    {!adminStatus.isClaimed && !adminStatus.envPasscodeConfigured
                      ? 'Prvo postavljanje administratorske lozinke (min. 8 znakova)'
                      : 'Potvrda administratorske lozinke'}
                  </span>
                </div>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder={
                    !adminStatus.isClaimed && !adminStatus.envPasscodeConfigured
                      ? 'Odaberite novu administratorsku lozinku...'
                      : 'Unesite administratorsku lozinku...'
                  }
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {!adminStatus.isClaimed && !adminStatus.envPasscodeConfigured && (
                  <p className="text-[11px] text-slate-600">
                    Prvom prijavom zaključavate administratorsku ulogu s vašom lozinkom. Lozinku možete i trajno postaviti u tajnim varijablama sustava (`ADMIN_PASSCODE`).
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="login-school"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Naziv ustanove (za zaglavlje generiranih dokumenata)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="login-school"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="npr. Gimnazija / Osnovna škola..."
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="block text-xs font-medium text-slate-700">
                Odabir radne domene
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(DOMAINS) as DomainId[]).map((dId) => {
                  const dom = DOMAINS[dId];
                  const active = selectedDomain === dId;
                  return (
                    <button
                      key={dId}
                      type="button"
                      onClick={() => setSelectedDomain(dId)}
                      className={`text-left p-3.5 rounded-lg border transition-colors ${
                        active
                          ? 'border-blue-700 bg-blue-50/70 ring-1 ring-blue-700'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {dom.name}
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">
                          {dom.forms.length} obrasca
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {dom.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                {loginMode === 'admin'
                  ? 'Administratorski pristup s ovlasti dodavanja dokumenata'
                  : 'Standardni pristup za djelatnike u sustavu @skole.hr'}
              </span>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>
                  {loading
                    ? 'Prijava...'
                    : loginMode === 'admin'
                    ? 'Prijavi se kao Admin'
                    : 'Otvori radni prostor'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>Školski Um · Administrativno središte za osnovne i srednje škole</span>
          <span>Lokalna obrada osobnih podataka učenika · Administratorska kontrola baze dokumenata</span>
        </div>
      </footer>
    </div>
  );
};
