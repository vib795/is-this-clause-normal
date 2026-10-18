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
  contract_text?: string; // full extracted text, used by counter-agreement generation
  provider?: string; // provider used for analysis (e.g. "anthropic")
  model?: string; // model id used for analysis
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

// Theme-aware via app/globals.css design tokens (--color-sev-*). Each
// class resolves to a CSS variable that switches between light and dark.
export const SEVERITY_CONFIG = {
  red: {
    label: 'Deal-Breaker',
    color: 'text-sev-red',
    bg: 'bg-sev-red-soft',
    border: 'border-sev-red-stroke',
    dot: 'bg-sev-red',
    badge: 'bg-sev-red-soft text-sev-red border border-sev-red-stroke',
  },
  yellow: {
    label: 'Negotiate',
    color: 'text-sev-yellow',
    bg: 'bg-sev-yellow-soft',
    border: 'border-sev-yellow-stroke',
    dot: 'bg-sev-yellow',
    badge: 'bg-sev-yellow-soft text-sev-yellow border border-sev-yellow-stroke',
  },
  green: {
    label: 'Acceptable',
    color: 'text-sev-green',
    bg: 'bg-sev-green-soft',
    border: 'border-sev-green-stroke',
    dot: 'bg-sev-green',
    badge: 'bg-sev-green-soft text-sev-green border border-sev-green-stroke',
  },
};

export const NEGOTIABILITY_CONFIG = {
  high:   { label: 'Usually negotiable',   color: 'text-sev-green', badge: 'bg-sev-green-soft text-sev-green border border-sev-green-stroke' },
  medium: { label: 'Sometimes negotiable', color: 'text-sev-yellow', badge: 'bg-sev-yellow-soft text-sev-yellow border border-sev-yellow-stroke' },
  low:    { label: 'Rarely negotiable',    color: 'text-text-3',     badge: 'bg-glass text-text-3 border border-stroke' },
};

export const RISK_CONFIG: Record<OverallRisk, { label: string; color: string; description: string }> = {
  low:      { label: 'Low Risk',      color: 'text-sev-green',  description: 'Generally safe to sign with minor considerations.' },
  medium:   { label: 'Medium Risk',   color: 'text-sev-yellow', description: 'Several items worth negotiating before signing.' },
  high:     { label: 'High Risk',     color: 'text-sev-orange', description: 'Multiple red flags — negotiate before signing.' },
  critical: { label: 'Critical Risk', color: 'text-sev-red',    description: 'Do not sign without significant changes.' },
};
