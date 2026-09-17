// Mirrors nool-core's services/core/src/api/schemas/school_admin.py exactly
// (field-for-field, camelCase) - see spec/docs/api-reference.html "School Admin".

export type UserStatus = 'PENDING' | 'ACTIVE' | 'DEACTIVATED';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
export type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';

/** The toggleable unit for Plan.enabled_features (set in nool-super-admin's
 * Plans page) - mirrors nool-core's Feature enum exactly. `null` on
 * Profile.enabledFeatures means every feature is enabled (no restriction),
 * same convention as the plan-level field it's derived from. */
export type Feature = 'question_paper' | 'voice_test' | 'homework' | 'assistant' | 'leaderboard' | 'improvement_analysis';

export const BLOOM_LEVELS: readonly BloomLevel[] = [
  'REMEMBER',
  'UNDERSTAND',
  'APPLY',
  'ANALYZE',
  'EVALUATE',
  'CREATE',
];

export interface SchoolTeacher {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string | null;
  employeeId: string | null;
  classIds: string[];
  status: UserStatus;
  mustChangePassword: boolean;
}

export interface InviteTeacherInput {
  email: string;
  displayName: string;
  phoneNumber?: string;
  employeeId?: string;
}

/** No account details echoed back beyond what's needed to reveal the temp password once. */
export interface InviteTeacherResult {
  id: string;
  status: UserStatus;
  tempPassword: string;
}

export interface SchoolStudent {
  id: string;
  displayName: string;
  email: string;
  classId: string;
  rollNumber: number;
  guardianName: string | null;
  guardianPhone: string | null;
  dateOfBirth: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
}

export interface CreateStudentInput {
  displayName: string;
  email: string;
  classId: string;
  rollNumber: number;
  guardianName?: string;
  guardianPhone?: string;
  dateOfBirth?: string;
}

export interface CreateStudentResult {
  id: string;
  displayName: string;
  email: string;
  classId: string;
  rollNumber: number;
  status: UserStatus;
  tempPassword: string;
}

export interface UpdateStudentInput {
  classId?: string;
  status?: UserStatus;
  displayName?: string;
  guardianName?: string;
  guardianPhone?: string;
  dateOfBirth?: string;
}

export interface UpdateTeacherInput {
  displayName?: string;
  phoneNumber?: string;
  employeeId?: string;
}

/** No account details echoed back beyond what's needed to reveal the new temp password once. */
export interface ResetPasswordResult {
  tempPassword: string;
}

export type BloomDistribution = Partial<Record<BloomLevel, number>>;

export interface BloomDistributionResult {
  /** null = no override set - generation falls back to the teacher's own choice / system default. */
  distribution: BloomDistribution | null;
}

/** null = no logo set - a base64 data: URI, same precedent as a Question
 * Paper's picked logo (see nool-core's School.logo_data_uri docstring). */
export interface SchoolLogoResult {
  logoDataUri: string | null;
}

/** One row's outcome from a bulk-invite/bulk-create upload. */
export interface BulkRowResult {
  row: number;
  status: string;
  email: string | null;
  tempPassword: string | null;
  error: string | null;
}

export interface BulkImportResult {
  results: BulkRowResult[];
  createdCount: number;
  errorCount: number;
}

export interface ClassAssignment {
  teacherId: string;
  subjectId: string;
}

export interface SchoolAdminClass {
  id: string;
  grade: number;
  section: string;
  studentCount: number;
  assignments: ClassAssignment[];
  status: UserStatus;
}

export interface CreateClassInput {
  grade: number;
  section: string;
}

/** School Admin can only ever create classes for grades 1 through 12. */
export const MIN_GRADE = 1;
export const MAX_GRADE = 12;

/** The "Class" level (e.g. "Class 10") of the School -> Class -> Section ->
 * Students hierarchy - what this app's own "Classes" page (SchoolAdminClass,
 * above) has always called a "class" is really a Section (one grade+section
 * pairing) in that hierarchy; kept named SchoolAdminClass on the wire and in
 * code for now to avoid a wider rename - see nool-core's SchoolGrade model
 * docstring for why the backend takes the same additive approach. */
export interface SchoolGrade {
  id: string;
  grade: number;
  sectionCount: number;
  studentCount: number;
  status: UserStatus;
}

export interface CreateGradeInput {
  grade: number;
}

/** Which subjects a Class teaches - narrower than SchoolCurriculum (the
 * whole-school toggle), picked explicitly per Class. Reuses SubjectToggle's
 * shape from the Curriculum page. */
export interface GradeSubjects {
  gradeId: string;
  subjects: SubjectToggle[];
}

export interface SubjectToggle {
  id: string;
  name: string;
  enabled: boolean;
}

/** The generated credential email is drafted client-side (subject/body
 * prefilled from the invite/reset context) and the admin can edit it
 * before sending - see CredentialReveal's "Send by email" action. */
export interface SendCredentialsEmailInput {
  subject: string;
  message: string;
  tempPassword: string;
}

export interface SendCredentialsEmailResult {
  sent: boolean;
}

export interface SchoolCurriculum {
  board: string;
  subjects: SubjectToggle[];
}

/** A dataset as scoped to this school - `enabled` is this school's own
 * toggle (school_datasets), separate from the global catalog Super Admin
 * manages. Creation/editing stays Super-Admin-only; this app only toggles
 * availability. */
export interface SchoolDataset {
  id: string;
  name: string;
  questionCount: number;
  description: string;
  enabled: boolean;
  /** A school-exclusive dataset (e.g. a bank meant only for this school) — not part of the shared default catalog. */
  restricted: boolean;
}

/** One row per named question-bank set this school has used (plus one
 * synthetic row for the general bank, collectionName=null) - this
 * school's own, locally-owned content, shown alongside the global
 * (Super-Admin-owned) Dataset catalog on the Datasets page. */
export interface CustomQuestionCollectionSummary {
  collectionName: string | null;
  questionCount: number;
}

export interface BloomScore {
  level: BloomLevel;
  percent: number | null;
}

export interface ClassBreakdown {
  classId: string;
  label: string;
  masteryAvgPercent: number;
  improvementPercent: number;
}

export interface MasteryTrendPoint {
  periodLabel: string;
  masteryAvgPercent: number;
  testCount: number;
}

export interface SchoolAnalytics {
  schoolMasteryAvgPercent: number;
  classBreakdown: ClassBreakdown[];
  bloomAverages: BloomScore[];
  masteryTrend: MasteryTrendPoint[];
}

/** Envelope every paginated oversight endpoint returns - see apiClient.ts's
 * apiRequest, used directly here (not apiRequestList) so the real `total`
 * is available for a Prev/Next control.
 */
export interface PageEnvelope<T> {
  items: T[];
  total: number;
}

export type TestStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'RESULTS_PROCESSING' | 'RESULTS_READY';
export type HomeworkStatus = 'GENERATING' | 'REVIEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type QuestionPaperStatus = 'DRAFT' | 'GENERATING' | 'VALIDATION_FAILED' | 'REVIEW' | 'FINALIZED';

export interface SchoolVoiceTest {
  id: string;
  classLabel: string;
  subjectName: string;
  teacherName: string | null;
  status: TestStatus;
  assignedCount: number;
  completedCount: number;
  createdAt: string;
}

export interface SchoolHomework {
  id: string;
  classLabel: string;
  gapTopic: string;
  teacherName: string | null;
  status: HomeworkStatus;
  assignedCount: number;
  completedCount: number;
}

export interface SchoolQuestionPaper {
  id: string;
  name: string;
  examType: string;
  subjectName: string;
  createdByName: string;
  status: QuestionPaperStatus;
  createdAt: string;
}


export interface SchoolLeaderboardEntry {
  studentId: string;
  displayName: string;
  classLabel: string;
  points: number;
  rank: number;
}

export type QuestionBankSource = 'QUESTION_PAPER' | 'HOMEWORK' | 'CUSTOM';

/** One previously-generated question, aggregated at read time from
 * wherever it was actually generated (a Question Paper or a Homework
 * set) - see nool-core's list_school_question_bank. A CUSTOM row is the
 * one source that isn't generated - see CustomQuestion below. */
export interface SchoolQuestionBankEntry {
  id: string;
  text: string;
  answer: string | null;
  bloomLevel: BloomLevel;
  subjectName: string;
  topicLabel: string;
  source: QuestionBankSource;
  sourceName: string;
  createdAt: string | null;
  /** CUSTOM rows only - null means the school's general question bank. */
  collectionName: string | null;
}

// Global curriculum catalog (read-only here - Super Admin owns create/
// edit/delete) - see nool-core's src/api/routes/curriculum.py.
export interface Subject {
  id: string;
  name: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
}

export interface Topic {
  id: string;
  chapterId: string;
  name: string;
}

// Custom questions - School Admin-authored content, following the full
// curriculum hierarchy plus Class - see nool-core's CustomQuestion.
export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'TRUE_FALSE';

export const QUESTION_TYPES: readonly QuestionType[] = ['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER', 'TRUE_FALSE'];

/** Only MCQ and TRUE_FALSE carry fixed choices. */
export const CHOICE_QUESTION_TYPES: readonly QuestionType[] = ['MCQ', 'TRUE_FALSE'];

export interface CustomQuestion {
  id: string;
  // Exactly one of classId/grade is set. classId = one specific Section
  // (a single grade+section, e.g. "Class 10 · A"). grade = the whole
  // Class (every section in that grade at this school) - for content
  // common across sections that shouldn't need duplicating per section.
  classId: string | null;
  grade: number | null;
  subjectId: string;
  chapterId: string;
  topicId: string | null;
  bloomLevel: BloomLevel;
  questionType: QuestionType;
  text: string;
  options: string[] | null;
  answer: string;
  createdBy: string;
  createdAt: string;
  /** Null = the school's general question bank (the default). A name
   * groups this question under a custom-named set instead. */
  collectionName: string | null;
}

export interface CreateCustomQuestionInput {
  // Exactly one of classId/grade - see CustomQuestion's docstring above.
  classId?: string | null;
  grade?: number | null;
  subjectId: string;
  chapterId: string;
  topicId?: string | null;
  bloomLevel: BloomLevel;
  questionType: QuestionType;
  text: string;
  options?: string[] | null;
  answer: string;
  /** Blank/omitted = the school's general question bank. */
  collectionName?: string | null;
}

export type UpdateCustomQuestionInput = Partial<CreateCustomQuestionInput>;

export interface SchoolSubscription {
  schoolId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  renewsAt: string;
  teacherCount: number;
  teacherLimit: number;
  studentCount: number;
  studentLimit: number;
  testCount: number;
  testLimit: number | null;
  questionPaperCount: number;
  questionPaperLimit: number | null;
}

export interface UpgradeRequestInput {
  message?: string;
}

export interface UpgradeRequestResult {
  recorded: boolean;
  emailed: boolean;
}

export interface SchoolAuditLogEntry {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
}

// Internal-only support-ticket tracker - see nool-core's SupportTicket
// model docstring. No email/Slack integration by design for this first
// version.
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface SupportTicket {
  id: string;
  schoolId: string;
  schoolName: string;
  createdBy: string;
  createdByName: string;
  subject: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  commentCount: number;
}

export interface TicketComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CreateSupportTicketInput {
  subject: string;
  description: string;
}

export interface SchoolAdminMe {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string | null;
  schoolName: string;
}

export interface UpdateSchoolAdminMeInput {
  displayName?: string;
  phoneNumber?: string;
}

// --- Advanced Reporting -----------------------------------------------------
// See nool-core's src/services/reporting.py DIMENSIONS registry - School
// Admin only ever sees the SCHOOL-scoped subset (CLASS/SECTION/STUDENT),
// same registry as nool-super-admin's own Reports page.

export interface MetricSpec {
  key: string;
  label: string;
}

export interface DimensionSpec {
  key: string;
  label: string;
  scope: 'PLATFORM' | 'SCHOOL';
  metrics: MetricSpec[];
}

export interface RunReportInput {
  dimension: string;
  metrics: string[];
  filters?: Record<string, unknown>;
}

export interface ReportRow {
  label: string;
  [metric: string]: string | number | boolean | null;
}

export interface ReportResult {
  dimension: string;
  metrics: string[];
  rows: ReportRow[];
}

export interface ReportConfiguration {
  id: string;
  name: string;
  dimension: string;
  metrics: string[];
  filters: Record<string, unknown>;
  schoolId: string | null;
  createdAt: string;
}

export interface CreateReportConfigurationInput {
  name: string;
  dimension: string;
  metrics: string[];
  filters?: Record<string, unknown>;
}

export type ReportAccessLevel = 'VIEW' | 'VIEW_EXPORT';

export interface SharedReport {
  shareId: string;
  name: string;
  dimension: string;
  metrics: string[];
  filters: Record<string, unknown>;
  accessLevel: ReportAccessLevel;
  sharedByName: string;
  expiresAt: string | null;
}
