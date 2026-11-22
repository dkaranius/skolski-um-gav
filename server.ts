import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Ephemeral fallback if SESSION_SECRET is not provided in environment
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const revokedTokens = new Set<string>();

type DomainId =
  | 'ravnatelj'
  | 'tajnistvo_racunovodstvo'
  | 'strucni_suradnici'
  | 'nastavnici';

type UserRole = 'admin' | 'user';

const VALID_DOMAINS: DomainId[] = [
  'ravnatelj',
  'tajnistvo_racunovodstvo',
  'strucni_suradnici',
  'nastavnici',
];

const DATA_DIR = path.resolve(process.cwd(), 'data');

function resolveDataFile(fileName: string): string {
  const safeBase = path.basename(fileName);
  const resolved = path.resolve(DATA_DIR, safeBase);
  if (!resolved.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid data path');
  }
  return resolved;
}

const ADMIN_AUTH_FILE = resolveDataFile('admin-auth.json');
const ADMIN_DOCS_FILE = resolveDataFile('admin-documents.json');
const QUOTA_FILE = resolveDataFile('quota-usage.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface AdminAuthRecord {
  salt: string;
  hash: string;
  claimedBy: string;
  claimedAt: string;
}

interface StoredAdminDoc {
  id: string;
  name: string;
  fileType: string;
  domainScope: DomainId | 'all';
  content: string;
  charCount: number;
  pageCount?: number;
  piiMaskedCount: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface UserQuotaDay {
  email: string;
  fullName: string;
  role: UserRole;
  date: string;
  requestsUsed: number;
  tokensUsed: number;
  lastUsedAt: string;
}

interface QuotaStore {
  settings: {
    staffDailyLimit: number;
    adminDailyLimit: number;
  };
  usageByUserDate: Record<string, UserQuotaDay>;
}

function getTodayDateStr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zagreb' });
}

function readQuotaStore(): QuotaStore {
  const defaultLimit = Math.max(1, Number(process.env.DAILY_USER_QUOTA || 25) || 25);
  try {
    if (!fs.existsSync(QUOTA_FILE)) {
      return {
        settings: { staffDailyLimit: defaultLimit, adminDailyLimit: 100 },
        usageByUserDate: {},
      };
    }
    const raw = fs.readFileSync(QUOTA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as QuotaStore;
    return {
      settings: {
        staffDailyLimit:
          Number(parsed?.settings?.staffDailyLimit) > 0
            ? Number(parsed.settings.staffDailyLimit)
            : defaultLimit,
        adminDailyLimit:
          Number(parsed?.settings?.adminDailyLimit) > 0
            ? Number(parsed.settings.adminDailyLimit)
            : 100,
      },
      usageByUserDate:
        parsed?.usageByUserDate && typeof parsed.usageByUserDate === 'object'
          ? parsed.usageByUserDate
          : {},
    };
  } catch {
    return {
      settings: { staffDailyLimit: defaultLimit, adminDailyLimit: 100 },
      usageByUserDate: {},
    };
  }
}

function writeQuotaStore(store: QuotaStore) {
  ensureDataDir();
  const tmpFile = resolveDataFile(`quota-usage.${process.pid}.tmp`);
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpFile, QUOTA_FILE);
}

function getUserQuotaStatus(user: SessionPayload) {
  const store = readQuotaStore();
  const today = getTodayDateStr();
  const key = `${user.email}::${today}`;
  const entry = store.usageByUserDate[key];
  const limitToday =
    user.role === 'admin'
      ? store.settings.adminDailyLimit
      : store.settings.staffDailyLimit;
  const usedToday = entry?.requestsUsed ?? 0;
  const tokensUsedToday = entry?.tokensUsed ?? 0;
  return {
    usedToday,
    limitToday,
    remainingToday: Math.max(0, limitToday - usedToday),
    tokensUsedToday,
    date: today,
  };
}

function recordUserQuotaUsage(user: SessionPayload, tokensDelta: number) {
  const store = readQuotaStore();
  const today = getTodayDateStr();
  const key = `${user.email}::${today}`;
  const prev = store.usageByUserDate[key];
  store.usageByUserDate[key] = {
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    date: today,
    requestsUsed: (prev?.requestsUsed ?? 0) + 1,
    tokensUsed: (prev?.tokensUsed ?? 0) + Math.max(0, Math.round(tokensDelta)),
    lastUsedAt: new Date().toISOString(),
  };

  // Prune records older than 14 days to keep file compact
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('sv-SE', { timeZone: 'Europe/Zagreb' });
  for (const [k, v] of Object.entries(store.usageByUserDate)) {
    if (v.date < cutoff) {
      delete store.usageByUserDate[k];
    }
  }

  writeQuotaStore(store);
  return getUserQuotaStatus(user);
}

function readAdminAuth(): AdminAuthRecord | null {
  try {
    if (!fs.existsSync(ADMIN_AUTH_FILE)) return null;
    const raw = fs.readFileSync(ADMIN_AUTH_FILE, 'utf8');
    const parsed = JSON.parse(raw) as AdminAuthRecord;
    if (!parsed?.salt || !parsed?.hash) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readStoredDocs(): StoredAdminDoc[] {
  try {
    if (!fs.existsSync(ADMIN_DOCS_FILE)) return [];
    const raw = fs.readFileSync(ADMIN_DOCS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAdminDoc[]) : [];
  } catch {
    return [];
  }
}

function writeStoredDocs(docs: StoredAdminDoc[]) {
  ensureDataDir();
  const tmpFile = resolveDataFile(`admin-documents.${process.pid}.tmp`);
  fs.writeFileSync(tmpFile, JSON.stringify(docs, null, 2), 'utf8');
  fs.renameSync(tmpFile, ADMIN_DOCS_FILE);
}

function sha256Digest(val: string): Buffer {
  return crypto.createHash('sha256').update(val, 'utf8').digest();
}

function isEmailAllowedAsAdmin(email: string): boolean {
  const configured = process.env.ADMIN_EMAILS?.trim();
  if (!configured) return true;
  const allowlist = configured
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return true;
  return allowlist.includes(email.trim().toLowerCase());
}

function verifyAdminPassword(password: string): boolean {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    return crypto.timingSafeEqual(
      sha256Digest(password),
      sha256Digest(envPasscode)
    );
  }
  const stored = readAdminAuth();
  if (!stored) return false;
  try {
    const derived = crypto.scryptSync(password, stored.salt, 64);
    const storedBuf = Buffer.from(stored.hash, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}

interface SessionPayload {
  email: string;
  fullName: string;
  schoolName: string;
  activeDomain: DomainId;
  role: UserRole;
  exp: number;
  jti: string;
}

function signSession(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySession(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, providedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encoded)
      .digest('base64url');

    const a = Buffer.from(providedSig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;

    if (!decoded || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    if (revokedTokens.has(decoded.jti)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function isSkoleHrEmail(email: string): boolean {
  return /^[^\s@]+@([a-z0-9-]+\.)*skole\.hr$/i.test(email.trim());
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY nije konfiguriran na poslužitelju. Postavite poslužiteljsku varijablu okruženja GEMINI_API_KEY (putem AI Studio API ključa / Secrets postavki ili u varijablama okruženja pri objavi na poslužitelj).'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface AuthedRequest extends Request {
  sessionUser?: SessionPayload;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Potrebna je prijava sa @skole.hr računom.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifySession(token);
  if (!payload) {
    res.status(401).json({ error: 'Sesija je istekla ili nije valjana. Prijavite se ponovno.' });
    return;
  }
  req.sessionUser = payload;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.sessionUser || req.sessionUser.role !== 'admin') {
    res.status(403).json({
      error: 'Ova radnja dopuštena je isključivo administratorima sustava.',
    });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Check whether Admin passcode is already configured / claimed
  app.get('/api/auth/admin-status', (_req: Request, res: Response) => {
    const envPasscodeConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
    const stored = readAdminAuth();
    res.json({
      envPasscodeConfigured,
      isClaimed: envPasscodeConfigured || Boolean(stored),
    });
  });

  // First-run atomic Admin claim (locked once claimed or when ADMIN_PASSCODE is set)
  app.post('/api/auth/claim-admin', (req: Request, res: Response) => {
    if (process.env.ADMIN_PASSCODE?.trim()) {
      res.status(409).json({
        error: 'Administratorska lozinka već je definirana putem poslužiteljske tajne.',
      });
      return;
    }

    const { email, adminPassword } = req.body ?? {};
    if (typeof email !== 'string' || !isSkoleHrEmail(email)) {
      res.status(400).json({
        error: 'Administrator mora imati važeću @skole.hr adresu e-pošte.',
      });
      return;
    }
    if (!isEmailAllowedAsAdmin(email)) {
      res.status(403).json({
        error: 'Ova @skole.hr adresa nije na popisu dopuštenih administratora.',
      });
      return;
    }
    if (typeof adminPassword !== 'string' || adminPassword.length < 8) {
      res.status(400).json({
        error: 'Administratorska lozinka mora imati najmanje 8 znakova.',
      });
      return;
    }

    ensureDataDir();
    if (fs.existsSync(ADMIN_AUTH_FILE)) {
      res.status(409).json({
        error: 'Administratorski pristup je već preuzet. Prijavite se s postojećom lozinkom.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(adminPassword, salt, 64).toString('hex');
    const record: AdminAuthRecord = {
      salt,
      hash,
      claimedBy: email.trim().toLowerCase(),
      claimedAt: new Date().toISOString(),
    };

    try {
      // 'wx' fails atomically if file already exists
      fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(record, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      });
      res.json({ ok: true });
    } catch {
      res.status(409).json({
        error: 'Administratorski pristup je već preuzet.',
      });
    }
  });

  // Auth endpoints
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, fullName, schoolName, domain, loginAsAdmin, adminPassword } =
      req.body ?? {};
    if (typeof email !== 'string' || !isSkoleHrEmail(email)) {
      res.status(400).json({
        error: 'Prijava je dopuštena isključivo s važećom @skole.hr adresom e-pošte.',
      });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanDomain: DomainId = VALID_DOMAINS.includes(domain)
      ? domain
      : 'strucni_suradnici';
    const cleanName =
      typeof fullName === 'string' && fullName.trim().length > 1
        ? fullName.trim().slice(0, 80)
        : cleanEmail.split('@')[0].replace(/\./g, ' ');
    const cleanSchool =
      typeof schoolName === 'string' && schoolName.trim().length > 2
        ? schoolName.trim().slice(0, 140)
        : 'Gimnazija Antuna Vrančića, Put Gimnazije 64, 22000 Šibenik';

    let role: UserRole = 'user';
    if (loginAsAdmin === true) {
      if (!isEmailAllowedAsAdmin(cleanEmail)) {
        res.status(403).json({
          error: 'Ova adresa e-pošte nema ovlasti administratora.',
        });
        return;
      }
      if (typeof adminPassword !== 'string' || !verifyAdminPassword(adminPassword)) {
        res.status(401).json({
          error: 'Neispravna administratorska lozinka.',
        });
        return;
      }
      role = 'admin';
    }

    const sessionPayload: SessionPayload = {
      email: cleanEmail,
      fullName: cleanName,
      schoolName: cleanSchool,
      activeDomain: cleanDomain,
      role,
      exp: Date.now() + 1000 * 60 * 60 * 12,
      jti: crypto.randomUUID(),
    };

    const token = signSession(sessionPayload);
    res.json({
      token,
      user: {
        email: sessionPayload.email,
        fullName: sessionPayload.fullName,
        schoolName: sessionPayload.schoolName,
        activeDomain: sessionPayload.activeDomain,
        role: sessionPayload.role,
      },
    });
  });

  app.post('/api/auth/switch-domain', requireAuth, (req: AuthedRequest, res: Response) => {
    const { domain } = req.body ?? {};
    if (!VALID_DOMAINS.includes(domain)) {
      res.status(400).json({ error: 'Odabrana domena nije valjana.' });
      return;
    }
    const prev = req.sessionUser!;
    const nextPayload: SessionPayload = {
      ...prev,
      activeDomain: domain,
      jti: crypto.randomUUID(),
    };
    const token = signSession(nextPayload);
    res.json({
      token,
      user: {
        email: nextPayload.email,
        fullName: nextPayload.fullName,
        schoolName: nextPayload.schoolName,
        activeDomain: nextPayload.activeDomain,
        role: nextPayload.role,
      },
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = verifySession(authHeader.slice(7).trim());
      if (payload) {
        revokedTokens.add(payload.jti);
      }
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    const u = req.sessionUser!;
    res.json({
      user: {
        email: u.email,
        fullName: u.fullName,
        schoolName: u.schoolName,
        activeDomain: u.activeDomain,
        role: u.role,
      },
    });
  });

  // Shared Admin-curated documents (readable by all authenticated @skole.hr users)
  app.get('/api/documents', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDomain = String(req.query.domain ?? req.sessionUser!.activeDomain);
    const docs = readStoredDocs();
    const filtered = docs
      .filter((d) => d.domainScope === 'all' || d.domainScope === requestedDomain)
      .map((d) => ({
        id: d.id,
        name: d.name,
        fileType: d.fileType,
        domainScope: d.domainScope,
        charCount: d.charCount,
        pageCount: d.pageCount,
        piiMaskedCount: d.piiMaskedCount,
        uploadedBy: d.uploadedBy,
        uploadedAt: d.uploadedAt,
        excerpt: d.content.slice(0, 1200),
      }));
    res.json({ documents: filtered });
  });

  app.get('/api/documents/:id/preview', requireAuth, (req: AuthedRequest, res: Response) => {
    const doc = readStoredDocs().find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Dokument nije pronađen.' });
      return;
    }
    res.json({ id: doc.id, name: doc.name, content: doc.content });
  });

  // Admin-only document mutations
  app.post(
    '/api/admin/documents',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const { name, fileType, domainScope, content, pageCount, piiMaskedCount } =
        req.body ?? {};

      if (typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({ error: 'Naziv dokumenta je obvezan.' });
        return;
      }
      if (typeof content !== 'string' || content.trim().length < 10) {
        res.status(400).json({ error: 'Sadržaj dokumenta je prekratak ili prazan.' });
        return;
      }
      const validScope: DomainId | 'all' =
        domainScope === 'all' || VALID_DOMAINS.includes(domainScope)
          ? domainScope
          : req.sessionUser!.activeDomain;

      const cleanContent = content.trim().slice(0, 80000);
      const newDoc: StoredAdminDoc = {
        id: `adm-${crypto.randomUUID()}`,
        name: name.trim().slice(0, 140),
        fileType: String(fileType || 'DOKUMENT').slice(0, 24),
        domainScope: validScope,
        content: cleanContent,
        charCount: cleanContent.length,
        pageCount: typeof pageCount === 'number' ? pageCount : undefined,
        piiMaskedCount: typeof piiMaskedCount === 'number' ? piiMaskedCount : 0,
        uploadedBy: req.sessionUser!.email,
        uploadedAt: new Date().toISOString(),
      };

      const docs = readStoredDocs();
      docs.unshift(newDoc);
      writeStoredDocs(docs.slice(0, 40));

      res.status(201).json({
        document: {
          id: newDoc.id,
          name: newDoc.name,
          fileType: newDoc.fileType,
          domainScope: newDoc.domainScope,
          charCount: newDoc.charCount,
          pageCount: newDoc.pageCount,
          piiMaskedCount: newDoc.piiMaskedCount,
          uploadedBy: newDoc.uploadedBy,
          uploadedAt: newDoc.uploadedAt,
          excerpt: newDoc.content.slice(0, 1200),
        },
      });
    }
  );

  app.delete(
    '/api/admin/documents/:id',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const docs = readStoredDocs();
      const next = docs.filter((d) => d.id !== req.params.id);
      if (next.length === docs.length) {
        res.status(404).json({ error: 'Dokument nije pronađen.' });
        return;
      }
      writeStoredDocs(next);
      res.json({ ok: true });
    }
  );

  // Quota endpoints
  app.get('/api/quota/me', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({ quota: getUserQuotaStatus(req.sessionUser!) });
  });

  app.get(
    '/api/admin/quota',
    requireAuth,
    requireAdmin,
    (_req: AuthedRequest, res: Response) => {
      const store = readQuotaStore();
      const today = getTodayDateStr();
      const users = Object.values(store.usageByUserDate)
        .filter((u) => u.date === today)
        .sort((a, b) => b.requestsUsed - a.requestsUsed);
      res.json({
        settings: store.settings,
        todayDate: today,
        users,
      });
    }
  );

  app.post(
    '/api/admin/quota/settings',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const { staffDailyLimit, adminDailyLimit } = req.body ?? {};
      const staff = Number(staffDailyLimit);
      const admin = Number(adminDailyLimit);
      if (
        !Number.isInteger(staff) ||
        staff < 1 ||
        staff > 500 ||
        !Number.isInteger(admin) ||
        admin < 1 ||
        admin > 1000
      ) {
        res.status(400).json({
          error: 'Dnevni limiti moraju biti cijeli brojevi (djelatnici 1–500, administratori 1–1000).',
        });
        return;
      }
      const store = readQuotaStore();
      store.settings = { staffDailyLimit: staff, adminDailyLimit: admin };
      writeQuotaStore(store);
      res.json({
        settings: store.settings,
        myQuota: getUserQuotaStatus(req.sessionUser!),
      });
    }
  );

  app.post(
    '/api/admin/quota/reset',
    requireAuth,
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const { email } = req.body ?? {};
      if (typeof email !== 'string' || !isSkoleHrEmail(email)) {
        res.status(400).json({ error: 'Unesite valjanu @skole.hr adresu.' });
        return;
      }
      const store = readQuotaStore();
      const today = getTodayDateStr();
      const key = `${email.trim().toLowerCase()}::${today}`;
      if (store.usageByUserDate[key]) {
        store.usageByUserDate[key].requestsUsed = 0;
        store.usageByUserDate[key].tokensUsed = 0;
        writeQuotaStore(store);
      }
      res.json({ ok: true });
    }
  );

  // Gemini: Generate official Croatian administrative document JSON (ready for Word .docx export)
  app.post('/api/gemini/generate-form', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const currentQuota = getUserQuotaStatus(req.sessionUser!);
      if (currentQuota.remainingToday <= 0) {
        res.status(429).json({
          error: `Dosegli ste dnevni limit od ${currentQuota.limitToday} AI upita za račun ${req.sessionUser!.email}. Kvote se obnavljaju sutra ili ih može resetirati administrator.`,
          quota: currentQuota,
        });
        return;
      }

      const { domainName, domainContext, formTitle, legalBasis, formInputs, schoolName } =
        req.body ?? {};

      if (
        typeof formTitle !== 'string' ||
        typeof domainName !== 'string' ||
        !formInputs ||
        typeof formInputs !== 'object'
      ) {
        res.status(400).json({ error: 'Nedostaju obvezni podatci za generiranje obrasca.' });
        return;
      }

      const ai = getAiClient();
      const inputLines = Object.entries(formInputs as Record<string, unknown>)
        .map(([k, v]) => `- ${k}: ${String(v ?? '').slice(0, 1500)}`)
        .join('\n');

      const prompt = `
Sastavi službeni hrvatski školski administrativni dokument na temelju sljedećih parametara:
- Domena: ${domainName}
- Naziv obrasca: ${formTitle}
- Pravni temelj: ${legalBasis || 'Važeći propisi Republike Hrvatske iz područja odgoja i obrazovanja'}
- Službeni podatci ustanove: ${schoolName || 'Gimnazija Antuna Vrančića Šibenik, Put Gimnazije 64, 22000 Šibenik'} (OIB: 26870999432, MB: 3875903, Šifra škole: 15-081-506, Ravnatelj: Ivan Knežević, prof., Tel: 022/213-276, E-mail: gimnazija@gav.hr, Web: https://gav.hr/)
- Konkretni korisnički unosi:
${inputLines}

STROGA PRAVILA PRIVATNOSTI I FORMATA:
1. Nikada ne izmišljaj stvarna imena učenika, roditelja, OIB-e niti adrese. Za osobne podatke koristi isključivo čitke oznake u uglatim zagradama koje će korisnik upisati lokalno u Wordu ili spojiti iz lokalne tablice, npr.: [IME I PREZIME UČENIKA], [RAZRED], [IME I PREZIME RODITELJA/SKRBNIKA], [ADRESA STANOVANJA], [OIB].
2. Stil mora biti formalan, administrativno-pravni hrvatski jezik kakav koriste hrvatske osnovne i srednje škole (KLASA, URBROJ, zaglavlje, pravni temelj, izreka/odluka, obrazloženje, uputa o pravnom lijeku ako je akt primjenjiv, potpisno mjesto).
3. Ako je obrazac ugovor, suglasnost, GIK ili izvješće, prilagodi strukturu polja tako da svaki odjeljak bude jasan, uredan i odmah spreman za preuzimanje i ispis.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            `${domainContext || ''} Ti si stručnjak za hrvatsku školsku administraciju i upravno pisanje. Odgovaraj isključivo valjanim JSON-om prema zadanoj shemi na hrvatskom jeziku.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentTitle: { type: Type.STRING, description: 'Glavni naslov akta velikim slovima ili službenim nazivom' },
              schoolHeaderPlaceholder: { type: Type.STRING, description: 'Zaglavlje škole s nazivom, adresom i OIB-om ustanove' },
              klasaPlaceholder: { type: Type.STRING, description: 'Predložak za KLASA oznaku' },
              urbrojPlaceholder: { type: Type.STRING, description: 'Predložak za URBROJ oznaku' },
              placeAndDate: { type: Type.STRING, description: 'Mjesto i datum dokumenta' },
              legalBasis: { type: Type.STRING, description: 'Uvodna rečenica s točnim pozivanjem na zakone i pravilnike RH' },
              recipientPlaceholder: { type: Type.STRING, description: 'Blok s podatcima primatelja/učenika/roditelja/djelatnika u uglatim zagradama' },
              bodyParagraphs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Glavni odlomci izreke, odluke, točaka ugovora ili suglasnosti',
              },
              explanationParagraphs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Odlomci obrazloženja ili detaljne razrade',
              },
              legalRemedy: { type: Type.STRING, description: 'Uputa o pravnom lijeku ili završna napomena o suglasnosti/dostavi' },
              signatureBlock: { type: Type.STRING, description: 'Potpisni blok (npr. Ravnatelj / Razrednik / Roditelj)' },
              complianceNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 kratka pravna podsjetnika za djelatnika prije ispisa i potpisa',
              },
            },
            required: [
              'documentTitle',
              'schoolHeaderPlaceholder',
              'klasaPlaceholder',
              'urbrojPlaceholder',
              'placeAndDate',
              'legalBasis',
              'recipientPlaceholder',
              'bodyParagraphs',
              'explanationParagraphs',
              'legalRemedy',
              'signatureBlock',
              'complianceNotes',
            ],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      const updatedQuota = recordUserQuotaUsage(
        req.sessionUser!,
        response.usageMetadata?.totalTokenCount ?? 0
      );
      res.json({ document: parsed, quota: updatedQuota });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri generiranju dokumenta.';
      console.error('generate-form error:', err);
      res.status(500).json({ error: message });
    }
  });

  // Gemini: Domain-grounded chat using ONLY Admin-approved server documents + anonymized stats
  app.post('/api/gemini/chat', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const currentQuota = getUserQuotaStatus(req.sessionUser!);
      if (currentQuota.remainingToday <= 0) {
        res.status(429).json({
          error: `Dosegli ste dnevni limit od ${currentQuota.limitToday} AI upita za račun ${req.sessionUser!.email}. Kvote se obnavljaju sutra ili ih može resetirati administrator.`,
          quota: currentQuota,
        });
        return;
      }

      const {
        domainName,
        domainContext,
        regulationsSummary,
        messages,
        anonymizedStats,
        selectedDocumentIds,
      } = req.body ?? {};

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Poruka za razgovor ne smije biti prazna.' });
        return;
      }

      const ai = getAiClient();
      const recentHistory = messages
        .slice(-10)
        .map((m: { role?: string; content?: string }) =>
          `${m.role === 'assistant' ? 'SAVJETNIK' : 'KORISNIK'}: ${String(m.content ?? '').slice(0, 3000)}`
        )
        .join('\n\n');

      let extraContext = '';
      if (anonymizedStats && typeof anonymizedStats === 'object') {
        extraContext += `\n\nPRILOŽENA ANONIMIZIRANA STATISTIKA (BEZ OSOBNIH PODATAKA UČENIKA):\n${JSON.stringify(
          anonymizedStats,
          null,
          2
        )}`;
      }

      // Server-side lookup of Admin-approved documents only
      const userDomain = req.sessionUser!.activeDomain;
      const allServerDocs = readStoredDocs().filter(
        (d) => d.domainScope === 'all' || d.domainScope === userDomain
      );

      const requestedIds = Array.isArray(selectedDocumentIds)
        ? new Set(selectedDocumentIds.map((x) => String(x)))
        : null;

      const activeServerDocs = requestedIds
        ? allServerDocs.filter((d) => requestedIds.has(d.id))
        : allServerDocs;

      if (activeServerDocs.length > 0) {
        const docsBlock = activeServerDocs
          .slice(0, 8)
          .map(
            (d) =>
              `=== SLUŽBENI DOKUMENT ŠKOLE (dodao admin): ${d.name} ===\n${d.content.slice(
                0,
                35000
              )}`
          )
          .join('\n\n')
          .slice(0, 90000);
        extraContext += `\n\nSLUŽBENI DOKUMENTI ŠKOLE U BAZI ZNANJA:\n${docsBlock}`;
      }

      const systemInstruction = `${domainContext || ''}
Službeni podatci škole (izvor: https://gav.hr/):
- Naziv: Gimnazija Antuna Vrančića Šibenik
- Adresa: Put Gimnazije 64, 22000 Šibenik
- OIB: 26870999432 · Matični broj (MB): 3875903 · Šifra škole: 15-081-506
- Ravnatelj: Ivan Knežević, prof. (tel. 022/216-420, ravnatelj@gav.hr)
- Tajništvo / računovodstvo / stručni suradnici: tel. 022/213-276, e-mail: gimnazija@gav.hr, pitanja@gav.hr
- Web stranica: https://gav.hr/
- Veličina i ustroj: oko 550 učenika u ~24 razredna odjela, ~50 nastavnika i stručnih suradnika
- Obrazovni programi (5 smjerova): Opća gimnazija, Jezična gimnazija, Prirodoslovno-matematička gimnazija, Prirodoslovna gimnazija, Klasična gimnazija.

Trenutna domena korisnika: ${domainName || 'Školska administracija'}.
Relevantni zakoni i pravilnici u ovoj domeni (referiraj se na njih kad daješ savjet):
${String(regulationsSummary || '').slice(0, 4000)}

Upute za odgovor:
- Odgovaraj isključivo na hrvatskom jeziku, jasno, stručno i strukturirano.
- Kada u bazi znanja postoje službeni dokumenti koje je dodao administrator (npr. Statut škole, pravilnici, kurikulumi, zapisnici), odgovaraj ponajprije na temelju sadržaja tih dokumenata i izričito navedi iz kojeg dokumenta (i članka/stranice ako postoji) potječe savjet.
- Ako odgovor nije sadržan u priloženim dokumentima, jasno to napomeni te pruži savjet prema općim hrvatskim propisima domene.
- Ako korisnik traži izvješće za sjednicu (NV, RV, ŠO), napiši ga u obliku gotovog govora / pisanog izvješća koje djelatnik može odmah pročitati na sjednici.
- Ako korisnik traži izvedbeni plan (npr. izlet, terenska nastava), navedi ciljeve, odgojno-obrazovne ishode, vremenik, sigurnosne mjere i potrebnu dokumentaciju.
- Nikada ne traži osobne podatke učenika (imena, OIB); radi isključivo sa zbrojnim podatcima.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${recentHistory}${extraContext}\n\nSAVJETNIK:`,
        config: {
          systemInstruction,
        },
      });

      const updatedQuota = recordUserQuotaUsage(
        req.sessionUser!,
        response.usageMetadata?.totalTokenCount ?? 0
      );
      res.json({ reply: (response.text ?? '').trim(), quota: updatedQuota });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri komunikaciji s AI savjetnikom.';
      console.error('chat error:', err);
      res.status(500).json({ error: message });
    }
  });

  // Gemini: Generate structured PPTX slide deck from anonymized statistics or meeting topic
  app.post('/api/gemini/generate-pptx', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const currentQuota = getUserQuotaStatus(req.sessionUser!);
      if (currentQuota.remainingToday <= 0) {
        res.status(429).json({
          error: `Dosegli ste dnevni limit od ${currentQuota.limitToday} AI upita za račun ${req.sessionUser!.email}. Kvote se obnavljaju sutra ili ih može resetirati administrator.`,
          quota: currentQuota,
        });
        return;
      }

      const { domainName, presentationGoal, audience, anonymizedStats, customNotes } =
        req.body ?? {};

      if (typeof presentationGoal !== 'string' || presentationGoal.trim().length < 3) {
        res.status(400).json({ error: 'Unesite svrhu ili temu prezentacije.' });
        return;
      }

      const ai = getAiClient();
      const prompt = `
Kreiraj strukturiranu prezentaciju za hrvatsku školu:
- Domena: ${domainName || 'Škola'}
- Cilj prezentacije: ${presentationGoal}
- Ciljana publika: ${audience || 'Nastavničko vijeće / Roditelji'}
- Dodatne bilješke: ${String(customNotes || '').slice(0, 2000)}
- Anonimizirani statistički podatci: ${
        anonymizedStats ? JSON.stringify(anonymizedStats) : 'Nema priložene tablice; koristi jasne tematske slajdove.'
      }

Vrati 5 do 6 slajdova. Uključi:
1. Naslovni slajd (layout: "title")
2. Pregled ključnih brojki (layout: "kpi")
3. Analiza uspjeha / ocjena (layout: "chart_grades")
4. Analiza izostanaka (layout: "chart_absences")
5. Zaključci i preporuke / koraci za sljedeće razdoblje (layout: "actions")
Za svaki slajd napiši 3 do 5 sažetih, jasnih natuknica bez imena učenika te kratke bilješke za govornika (speakerNotes).
`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Ti si stručnjak za vizualnu komunikaciju i školsko izvještavanje u Republici Hrvatskoj. Vraćaš isključivo valjani JSON na hrvatskom jeziku bez osobnih podataka učenika.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              deckTitle: { type: Type.STRING },
              deckSubtitle: { type: Type.STRING },
              audience: { type: Type.STRING },
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    layout: {
                      type: Type.STRING,
                      description: 'Jedno od: title, kpi, chart_grades, chart_absences, bullets, actions',
                    },
                    bullets: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    speakerNotes: { type: Type.STRING },
                  },
                  required: ['title', 'layout', 'bullets', 'speakerNotes'],
                },
              },
            },
            required: ['deckTitle', 'deckSubtitle', 'audience', 'slides'],
          },
        },
      });

      const deck = JSON.parse((response.text ?? '{}').trim());
      const updatedQuota = recordUserQuotaUsage(
        req.sessionUser!,
        response.usageMetadata?.totalTokenCount ?? 0
      );
      res.json({ presentation: deck, quota: updatedQuota });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri generiranju prezentacije.';
      console.error('generate-pptx error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Skolski Um server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
