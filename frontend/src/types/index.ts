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
export type GroupMode = 'offline' | 'online' | 'hybrid';
export type GroupStatus = 'planned' | 'active' | 'finished' | 'cancelled';
export type LessonStatus = 'planned' | 'in_progress' | 'finished' | 'cancelled';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export type AssignmentKind = 'quiz' | 'writing' | 'speaking' | 'reading';
export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'returned';

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

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  timezone: string;
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

export interface CourseModule {
  id: string;
  order_index: number;
  title: string;
  summary: string | null;
  lessons_count: number;
}

export interface CourseFeature {
  id: string;
  icon: string | null;
  title: string;
  description: string | null;
  order_index: number;
}

export interface CourseReview {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
}

export interface GroupForCourse {
  id: string;
  branch_id: string | null;
  teacher_id: string | null;
  mode: string;
  start_date: string;
  max_students: number;
  enrolled_count: number;
}

export interface CourseDetail extends Course {
  modules: CourseModule[];
  features: CourseFeature[];
  reviews: CourseReview[];
  avg_rating: number | null;
  reviews_count: number;
  available_groups: GroupForCourse[];
}

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface EnrollmentRequest {
  id: string;
  student_id: string;
  group_id: string;
  status: EnrollmentRequestStatus;
  note: string | null;
  processed_by: string | null;
  processed_at: string | null;
  decision_reason: string | null;
  created_at: string;
}

export interface ActiveEnrollment {
  enrollment_id: string;
  group_id: string;
  course_id: string;
  course_title: string;
  language: Language;
  level: CefrLevel;
  started_at: string;
}

export interface ScheduleSlot {
  id: string;
  group_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_to: string | null;
}

export interface Group {
  id: string;
  course_id: string;
  branch_id: string | null;
  teacher_id: string | null;
  mode: GroupMode;
  start_date: string;
  end_date: string | null;
  max_students: number;
  status: GroupStatus;
  created_at: string;
}

export interface GroupDetail extends Group {
  slots: ScheduleSlot[];
}

export interface Enrollment {
  id: string;
  student_id: string;
  group_id: string;
  enrolled_at: string;
  left_at: string | null;
}

export interface Lesson {
  id: string;
  group_id: string;
  sequence: number;
  title: string;
  scheduled_at: string;
  duration_min: number;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  status: LessonStatus;
  content_md?: string | null;
  summary?: string | null;
}

export interface AttendanceRow {
  lesson_instance_id: string;
  student_id: string;
  status: AttendanceStatus;
  participation_score: number | null;
  comment: string | null;
}

export interface Assignment {
  id: string;
  lesson_instance_id: string;
  title: string;
  kind: AssignmentKind;
  instructions: string | null;
  due_at: string | null;
  max_score: number;
  auto_check: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  submitted_at: string | null;
  attempt_no: number;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
}

export interface Notification {
  id: string;
  channel: string;
  template_code: string;
  subject: string | null;
  body: string;
  scheduled_at: string;
  sent_at: string | null;
  read_at: string | null;
  status: string;
  created_at: string;
}

export interface NotificationList {
  items: Notification[];
  unread: number;
}

export interface Progress {
  student_id: string;
  enrollments: number;
  lessons_total: number;
  lessons_attended: number;
  attendance_rate: number;
  homework_total: number;
  homework_submitted: number;
  homework_graded: number;
  avg_score: number | null;
}

export interface UserOut {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  locale: string;
  timezone: string;
  is_superuser: boolean;
  last_seen_at: string | null;
  created_at: string;
}
