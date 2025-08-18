
import type { IaCType } from './constants';

export interface IaCFile {
  id: string;
  file: File;
  content: string;
  type: IaCType;
}

export interface Source {
  title: string;
  url: string;
}

export type TimeToFix = 'Quick (< 1 hour)' | 'Medium (1-4 hours)' | 'Complex (> 4 hours)';

export interface Vulnerability {
  fileName: string;
  line?: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  description: string;
  recommendation: string;
  timeToFix: TimeToFix;
  sources?: Source[];
}

export interface HolisticRecommendation {
  title: string;
  description: string;
  sources?: Source[];
}

export interface PrioritizedAction {
  rank: number;
  title: string;
  vulnerabilityDescription: string;
  fileName: string;
  riskRationale: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  timeToFix: TimeToFix;
}

export interface ExecutiveSummary {
  overview: string;
  prioritizedActions: PrioritizedAction[];
}

export interface AnalysisResult {
  vulnerabilities: Vulnerability[];
  holisticRecommendations: HolisticRecommendation[];
  executiveSummary: ExecutiveSummary;
}
