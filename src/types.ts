export type DomainId =
  | 'ravnatelj'
  | 'tajnistvo_racunovodstvo'
  | 'strucni_suradnici'
  | 'nastavnici';

export type WorkspaceTab = 'obrasci' | 'chat' | 'propisi' | 'alati';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  email: string;
  fullName: string;
  schoolName: string;
  activeDomain: DomainId;
  role: UserRole;
}

export interface QuotaStatus {
  usedToday: number;
  limitToday: number;
  remainingToday: number;
  tokensUsedToday: number;
  date: string;
}

export interface AdminQuotaUserEntry {
  email: string;
  fullName: string;
  role: UserRole;
  date: string;
  requestsUsed: number;
  tokensUsed: number;
  lastUsedAt: string;
}

export interface AdminQuotaOverview {
  settings: {
    staffDailyLimit: number;
    adminDailyLimit: number;
  };
  todayDate: string;
  users: AdminQuotaUserEntry[];
}

export interface AdminDocument {
  id: string;
  name: string;
  fileType: string;
  domainScope: DomainId | 'all';
  charCount: number;
  pageCount?: number;
  piiMaskedCount: number;
  uploadedBy: string;
  uploadedAt: string;
  excerpt: string;
}

export interface RegulationItem {
  id: string;
  title: string;
  shortName: string;
  nnReference: string;
  category: string;
  summary: string;
  keyArticles: string[];
  protectedReadOnly: true;
}

export interface FormFieldDef {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date';
  options?: string[];
  defaultValue?: string;
  required?: boolean;
}

export interface FormTemplateDef {
  id: string;
  title: string;
  subtitle: string;
  legalBasis: string;
  supportsLocalStudentMerge?: boolean;
  fields: FormFieldDef[];
  examplePromptHint: string;
}

export interface DomainConfig {
  id: DomainId;
  name: string;
  shortLabel: string;
  description: string;
  subAppTitle: string;
  subAppDescription: string;
  systemContext: string;
  forms: FormTemplateDef[];
  regulations: RegulationItem[];
  quickChatPrompts: string[];
}

export interface GeneratedDocument {
  documentTitle: string;
  schoolHeaderPlaceholder: string;
  klasaPlaceholder: string;
  urbrojPlaceholder: string;
  placeAndDate: string;
  legalBasis: string;
  recipientPlaceholder: string;
  bodyParagraphs: string[];
  explanationParagraphs: string[];
  legalRemedy: string;
  signatureBlock: string;
  complianceNotes: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachedContextLabel?: string;
}

export interface ChatReferenceDocument {
  id: string;
  name: string;
  fileType: string;
  charCount: number;
  pageCount?: number;
  text: string;
  enabled: boolean;
  piiMaskedCount: number;
}

export interface LocalStudentRecord {
  id: string;
  imePrezime: string;
  razred: string;
  roditelj: string;
  prosjekOcjena: number;
  opravdaniSati: number;
  neopravdaniSati: number;
  opciUspjeh: 'Odličan' | 'Vrlo dobar' | 'Dobar' | 'Dovoljan' | 'Nedovoljan';
  pedagoskaMjera?: string;
  napomena?: string;
}

export interface AnonymizedClassStats {
  totalStudents: number;
  classBreakdown: Array<{
    razred: string;
    count: number;
    avgGrade: number;
    avgJustifiedAbsences: number;
    avgUnjustifiedAbsences: number;
  }>;
  gradeDistribution: {
    odlican: number;
    vrloDobar: number;
    dobar: number;
    dovoljan: number;
    nedovoljan: number;
  };
  overallAvgGrade: number;
  totalJustifiedAbsences: number;
  totalUnjustifiedAbsences: number;
  sourceLabel: string;
  piiStripped: true;
}

export interface PresentationSlide {
  title: string;
  subtitle?: string;
  layout: 'title' | 'kpi' | 'chart_grades' | 'chart_absences' | 'bullets' | 'actions';
  bullets: string[];
  speakerNotes: string;
}

export interface GeneratedPresentation {
  deckTitle: string;
  deckSubtitle: string;
  audience: string;
  slides: PresentationSlide[];
}
