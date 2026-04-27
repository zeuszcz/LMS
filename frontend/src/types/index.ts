export type UserRole =
  | 'student'
  | 'teacher'
  | 'parent'
  | 'methodist'
  | 'branch_manager'
  | 'admin'
  | 'b2b_coordinator';

export type Language = 'en' | 'de' | 'fr' | 'it' | 'es' | 'zh' | 'ja' | 'ko';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type AgeGroup = 'kids' | 'teens' | 'adults';

export interface CurrentUser {
  id: string;
  email: string | null;
  full_name: string;
  is_superuser: boolean;
  roles: UserRole[];
  locale: string;
  timezone: string;
  last_seen_at: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Course {
  id: string;
  title: string;
  language: Language;
  level: CefrLevel;
  age_group: AgeGroup;
  duration_weeks: number;
  lessons_count: number;
  description: string | null;
  methodology: string | null;
  published_at: string | null;
  created_at: string;
}

export interface CourseList {
  items: Course[];
  total: number;
}
