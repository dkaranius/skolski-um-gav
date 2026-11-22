import React, { useCallback, useEffect, useState } from 'react';
import { Gauge, RotateCcw, Save, X, AlertCircle, Check } from 'lucide-react';
import { AdminQuotaOverview, QuotaStatus } from '../types';

interface AdminQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onQuotaUpdated: (quota: QuotaStatus) => void;
}

export const AdminQuotaModal: React.FC<AdminQuotaModalProps> = ({
  isOpen,
  onClose,
  authToken,
  onQuotaUpdated,
}) => {
  const [overview, setOverview] = useState<AdminQuotaOverview | null>(null);
  const [staffLimit, setStaffLimit] = useState(25);
  const [adminLimit, setAdminLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/quota', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nije moguće učitati kvote.');
      setOverview(data);
      setStaffLimit(data.settings.staffDailyLimit);
      setAdminLimit(data.settings.adminDailyLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju.');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen, loadOverview]);

  if (!isOpen) return null;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      const res = await fetch('/api/admin/quota/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          staffDailyLimit: Number(staffLimit),
          adminDailyLimit: Number(adminLimit),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Spremanje nije uspjelo.');
      if (data.myQuota) onQuotaUpdated(data.myQuota);
      setSavedOk(true);
      await loadOverview();
      setTimeout(() => setSavedOk(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri spremanju.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetUser = async (email: string) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/quota/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset nije uspio.');
      await loadOverview();
      const meRes = await fetch('/api/quota/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const meData = await meRes.json();
      if (meRes.ok && meData.quota) onQuotaUpdated(meData.quota);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri resetiranju.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Kvote i dnevna potrošnja po korisnicima"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Gauge className="w-5 h-5 text-blue-700 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-slate-900 truncate">
                Dnevne kvote i potrošnja po @skole.hr računima
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Zaštita zajedničkog API ključa od prekomjerne potrošnje pojedinog korisnika.
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

        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quota Settings Form */}
          <form
            onSubmit={handleSaveSettings}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dnevni limit — Djelatnici (upita/dan)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={staffLimit}
                onChange={(e) => setStaffLimit(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dnevni limit — Administratori
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={adminLimit}
                onChange={(e) => setAdminLimit(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                {savedOk ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Spremljeno</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Spremam...' : 'Spremi limite'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Daily Usage Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Današnja potrošnja ({overview?.todayDate ?? '—'})
              </h3>
              <span className="tabular-nums">
                Aktivnih korisnika danas: {overview?.users.length ?? 0}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">@skole.hr korisnik</th>
                    <th className="py-2.5 px-3 font-semibold">Uloga</th>
                    <th className="py-2.5 px-3 font-semibold text-right">AI upita</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Tokeni</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Radnja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        Učitavanje potrošnje...
                      </td>
                    </tr>
                  ) : !overview || overview.users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        Danas još nema zabilježenih AI upita.
                      </td>
                    </tr>
                  ) : (
                    overview.users.map((u) => {
                      const limit =
                        u.role === 'admin'
                          ? overview.settings.adminDailyLimit
                          : overview.settings.staffDailyLimit;
                      return (
                        <tr key={u.email} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900">{u.fullName}</div>
                            <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {u.role === 'admin' ? 'Administrator' : 'Djelatnik'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {u.requestsUsed} / {limit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {u.tokensUsed.toLocaleString('hr-HR')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleResetUser(u.email)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Resetiraj</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
