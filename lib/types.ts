export type Severity = 'red' | 'yellow' | 'green';
export type OverallRisk = 'low' | 'medium' | 'high' | 'critical';
export type Category =
  | 'payment'
  | 'ip'
  | 'restrictions'
  | 'scope'
  | 'termination'
  | 'liability'
  | 'dispute'
  | 'data_privacy'
  | 'exclusivity';

export type ContractType = 'freelance_services' | 'employment' | 'saas' | 'nda' | 'vendor' | 'other';

export interface Finding {
  id: string;
  category: Category;
  severity: Severity;
  negotiability: 'high' | 'medium' | 'low';
  title: string;
  clause_text: string;
  why_risky: string;
  industry_standard: string;
  suggested_fix: string;
}

export interface MissingClause {
  id: string;
  title: string;
  why_important: string;
  suggested_language: string;
}

export interface AnalysisResult {
  overall_risk: OverallRisk;
  risk_score: number;
  contract_type: ContractType;
  jurisdiction: string;
  summary: string;
  recommendation: string;
  findings: Finding[];
  missing_clauses: MissingClause[];
  analyzed_at: string;
  contract_snippet: string; // first ~200 chars for display
  input_language?: string; // e.g. "hi-IN", present when Indian language was selected
}

export const CATEGORY_LABELS: Record<Category, string> = {
  payment: 'Payment & Financial',
  ip: 'Intellectual Property',
  restrictions: 'Restrictions',
  scope: 'Scope & Deliverables',
  termination: 'Termination & Exit',
  liability: 'Liability & Risk',
  dispute: 'Dispute Resolution',
  data_privacy: 'Data & Privacy',
  exclusivity: 'Exclusivity',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  freelance_services: 'Freelance Services',
  employment: 'Employment',
  saas: 'SaaS',
  nda: 'NDA',
  vendor: 'Vendor',
  other: 'Other',
};

export const SEVERITY_CONFIG = {
  red: {
    label: 'Deal-Breaker',
    color: 'text-red-400',
    bg: 'bg-red-950/40',
    border: 'border-red-800/50',
    dot: 'bg-red-500',
    badge: 'bg-red-950 text-red-400 border border-red-800/60',
  },
  yellow: {
    label: 'Negotiate',
    color: 'text-amber-400',
    bg: 'bg-amber-950/30',
    border: 'border-amber-800/40',
    dot: 'bg-amber-400',
    badge: 'bg-amber-950 text-amber-400 border border-amber-800/60',
  },
  green: {
    label: 'Acceptable',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-800/30',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-950 text-emerald-400 border border-emerald-800/60',
  },
};

export const NEGOTIABILITY_CONFIG = {
  high:   { label: 'Usually negotiable',   color: 'text-emerald-400', badge: 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' },
  medium: { label: 'Sometimes negotiable', color: 'text-amber-400',   badge: 'bg-amber-950 text-amber-400 border border-amber-800/60' },
  low:    { label: 'Rarely negotiable',    color: 'text-slate-400',   badge: 'bg-slate-800 text-slate-400 border border-slate-700/60' },
};

export const RISK_CONFIG: Record<OverallRisk, { label: string; color: string; description: string }> = {
  low: { label: 'Low Risk', color: 'text-emerald-400', description: 'Generally safe to sign with minor considerations.' },
  medium: { label: 'Medium Risk', color: 'text-amber-400', description: 'Several items worth negotiating before signing.' },
  high: { label: 'High Risk', color: 'text-orange-400', description: 'Multiple red flags — negotiate before signing.' },
  critical: { label: 'Critical Risk', color: 'text-red-400', description: 'Do not sign without significant changes.' },
};
