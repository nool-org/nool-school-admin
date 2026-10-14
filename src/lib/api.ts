import { apiDownload, apiRequest, apiRequestList, apiUpload } from './apiClient';
import type {
  BloomDistribution,
  BloomDistributionResult,
  BulkImportResult,
  ClassAssignment,
  CreateClassInput,
  CreateGradeInput,
  CreateReportConfigurationInput,
  CreateStudentInput,
  CreateStudentResult,
  DimensionSpec,
  InviteTeacherInput,
  InviteTeacherResult,
  PageEnvelope,
  QuestionBankSource,
  ReportConfiguration,
  ReportResult,
  ResetPasswordResult,
  RunReportInput,
  SchoolAdminClass,
  SchoolAdminMe,
  SchoolAnalytics,
  SchoolAuditLogEntry,
  SchoolCurriculum,
  SchoolDataset,
  GradeSubjects,
  SchoolGrade,
  SchoolChallenge,
  SchoolHomework,
  Chapter,
  CreateSchoolDatasetInput,
  DatasetQuestion,
  DatasetQuestionInput,
  Difficulty,
  BloomLevel,
  QuestionImportResult,
  Subtopic,
  UpdateDatasetQuestionInput,
  UpdateSchoolDatasetInput,
  SchoolLeaderboardEntry,
  SchoolLogoResult,
  Subject,
  Topic,
  SchoolQuestionBankEntry,
  SchoolQuestionPaper,
  SchoolStudent,
  SchoolSubscription,
  SchoolTeacher,
  SchoolVoiceTest,
  SendCredentialsEmailInput,
  SendCredentialsEmailResult,
  SharedReport,
  CreateSupportTicketInput,
  SupportTicket,
  TicketComment,
  UpdateSchoolAdminMeInput,
  UpdateStudentInput,
  UpdateTeacherInput,
  UpgradeRequestInput,
  UpgradeRequestResult,
  UserStatus,
} from './types';

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number | boolean][];
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// Teachers
export const listTeachers = (): Promise<SchoolTeacher[]> => apiRequestList('/school/teachers');

export const inviteTeacher = (input: InviteTeacherInput): Promise<InviteTeacherResult> =>
  apiRequest('/school/teachers/invite', { method: 'POST', body: input });

export const bulkInviteTeachers = (file: File): Promise<BulkImportResult> =>
  apiUpload('/school/teachers/bulk-invite', file);

export const updateTeacherStatus = (teacherId: string, status: UserStatus): Promise<SchoolTeacher> =>
  apiRequest(`/school/teachers/${teacherId}/status`, { method: 'PATCH', body: { status } });

export const updateTeacher = (teacherId: string, input: UpdateTeacherInput): Promise<SchoolTeacher> =>
  apiRequest(`/school/teachers/${teacherId}`, { method: 'PATCH', body: input });

export const resetTeacherPassword = (teacherId: string): Promise<ResetPasswordResult> =>
  apiRequest(`/school/teachers/${teacherId}/reset-password`, { method: 'POST' });

export const exportTeachers = (): Promise<void> => apiDownload('/school/teachers/export', 'teachers.csv');

/** Permanently deletes a teacher - unlike status (deactivate/activate), this
 * can't be undone. Idempotent server-side, so a batch of deletes can be
 * fired in parallel for "multi-delete" without per-row error handling. */
export const deleteTeacher = (teacherId: string): Promise<void> =>
  apiRequest(`/school/teachers/${teacherId}`, { method: 'DELETE' });

export const sendTeacherCredentialsEmail = (
  teacherId: string,
  input: SendCredentialsEmailInput,
): Promise<SendCredentialsEmailResult> =>
  apiRequest(`/school/teachers/${teacherId}/send-credentials-email`, { method: 'POST', body: input });

// Students
export const listStudents = (classId?: string): Promise<SchoolStudent[]> =>
  apiRequestList(classId ? `/school/students?classId=${encodeURIComponent(classId)}` : '/school/students');

export const createStudent = (input: CreateStudentInput): Promise<CreateStudentResult> =>
  apiRequest('/school/students', { method: 'POST', body: input });

export const bulkCreateStudents = (file: File): Promise<BulkImportResult> =>
  apiUpload('/school/students/bulk-create', file);

export const updateStudent = (studentId: string, input: UpdateStudentInput): Promise<SchoolStudent> =>
  apiRequest(`/school/students/${studentId}`, { method: 'PATCH', body: input });

export const resetStudentPassword = (studentId: string): Promise<ResetPasswordResult> =>
  apiRequest(`/school/students/${studentId}/reset-password`, { method: 'POST' });

export const exportStudents = (): Promise<void> => apiDownload('/school/students/export', 'students.csv');

export const deleteStudent = (studentId: string): Promise<void> =>
  apiRequest(`/school/students/${studentId}`, { method: 'DELETE' });

export const sendStudentCredentialsEmail = (
  studentId: string,
  input: SendCredentialsEmailInput,
): Promise<SendCredentialsEmailResult> =>
  apiRequest(`/school/students/${studentId}/send-credentials-email`, { method: 'POST', body: input });

// Classes
export const listClasses = (): Promise<SchoolAdminClass[]> => apiRequestList('/school/classes');

export const createClass = (input: CreateClassInput): Promise<SchoolAdminClass> =>
  apiRequest('/school/classes', { method: 'POST', body: input });

export const updateClass = (classId: string, input: CreateClassInput): Promise<SchoolAdminClass> =>
  apiRequest(`/school/classes/${classId}`, { method: 'PATCH', body: input });

export const updateClassAssignments = (
  classId: string,
  assignments: ClassAssignment[],
): Promise<SchoolAdminClass> =>
  apiRequest(`/school/classes/${classId}/assignments`, { method: 'PUT', body: { assignments } });

export const updateClassStatus = (classId: string, status: UserStatus): Promise<SchoolAdminClass> =>
  apiRequest(`/school/classes/${classId}/status`, { method: 'PATCH', body: { status } });

export const deleteClass = (classId: string): Promise<void> =>
  apiRequest(`/school/classes/${classId}`, { method: 'DELETE' });

// Grades ("Classes" in the School -> Class -> Section -> Students hierarchy -
// see SchoolGrade's doc comment in types.ts for why the Section entity above
// keeps its existing `/school/classes` endpoints/name)
export const listGrades = (): Promise<SchoolGrade[]> => apiRequestList('/school/grades');

export const createGrade = (input: CreateGradeInput): Promise<SchoolGrade> =>
  apiRequest('/school/grades', { method: 'POST', body: input });

export const updateGradeStatus = (gradeId: string, status: UserStatus): Promise<SchoolGrade> =>
  apiRequest(`/school/grades/${gradeId}/status`, { method: 'PATCH', body: { status } });

export const deleteGrade = (gradeId: string): Promise<void> =>
  apiRequest(`/school/grades/${gradeId}`, { method: 'DELETE' });

// Read-only - assigning subjects to a Class is exclusively Super Admin/
// PM's job now; PUT /school/grades/{id}/subjects no longer exists.
export const getGradeSubjects = (gradeId: string): Promise<GradeSubjects> =>
  apiRequest(`/school/grades/${gradeId}/subjects`);

// Curriculum
// Read-only for School Admin - assignment is exclusively Super Admin's
// job now (see nool-core's school_admin.py get_school_curriculum
// docstring; PUT /school/curriculum no longer exists).
export const getCurriculum = (): Promise<SchoolCurriculum> => apiRequest('/school/curriculum');

// Datasets - assigned catalog datasets (owned=false) are read-only here;
// only Super Admin assigns them (PUT /school/datasets no longer exists).
// The school's own question banks (owned=true) are fully managed here.
export const listDatasets = (): Promise<SchoolDataset[]> => apiRequestList('/school/datasets');

export const createDataset = (input: CreateSchoolDatasetInput): Promise<SchoolDataset> =>
  apiRequest('/school/datasets', { method: 'POST', body: input });

export const updateDataset = (datasetId: string, input: UpdateSchoolDatasetInput): Promise<SchoolDataset> =>
  apiRequest(`/school/datasets/${datasetId}`, { method: 'PATCH', body: input });

/** 409 (with a readable message) when the bank is used by homework or a question paper. */
export const deleteDataset = (datasetId: string): Promise<void> =>
  apiRequest(`/school/datasets/${datasetId}`, { method: 'DELETE' });

export const listDatasetQuestions = (
  datasetId: string,
  params: {
    chapterId?: string;
    topicId?: string;
    subtopicId?: string;
    bloomLevel?: BloomLevel;
    difficulty?: Difficulty;
    q?: string;
    limit: number;
    offset: number;
  },
): Promise<PageEnvelope<DatasetQuestion>> => apiRequest(`/school/datasets/${datasetId}/questions${toQuery(params)}`);

export const createDatasetQuestion = (datasetId: string, input: DatasetQuestionInput): Promise<DatasetQuestion> =>
  apiRequest(`/school/datasets/${datasetId}/questions`, { method: 'POST', body: input });

export const updateDatasetQuestion = (
  datasetId: string,
  questionId: string,
  input: UpdateDatasetQuestionInput,
): Promise<DatasetQuestion> =>
  apiRequest(`/school/datasets/${datasetId}/questions/${questionId}`, { method: 'PATCH', body: input });

export const deleteDatasetQuestion = (datasetId: string, questionId: string): Promise<void> =>
  apiRequest(`/school/datasets/${datasetId}/questions/${questionId}`, { method: 'DELETE' });

export const bulkImportDatasetQuestions = (datasetId: string, file: File): Promise<QuestionImportResult> =>
  apiUpload(`/school/datasets/${datasetId}/questions/bulk-import`, file);

// Analytics + subscription (read-only, except the upgrade request below)
export const getAnalytics = (): Promise<SchoolAnalytics> => apiRequest('/school/analytics');

export const getSubscription = (): Promise<SchoolSubscription> => apiRequest('/school/subscription');

export const requestSubscriptionUpgrade = (input: UpgradeRequestInput): Promise<UpgradeRequestResult> =>
  apiRequest('/school/subscription/upgrade-request', { method: 'POST', body: input });

// Support tickets (own school - see nool-core's SupportTicket)
export const listSupportTickets = (): Promise<SupportTicket[]> => apiRequestList('/school/tickets');
export const createSupportTicket = (input: CreateSupportTicketInput): Promise<SupportTicket> =>
  apiRequest('/school/tickets', { method: 'POST', body: input });
export const getSupportTicket = (ticketId: string): Promise<SupportTicket> =>
  apiRequest(`/school/tickets/${ticketId}`);
export const listTicketComments = (ticketId: string): Promise<TicketComment[]> =>
  apiRequestList(`/school/tickets/${ticketId}/comments`);
export const createTicketComment = (ticketId: string, body: string): Promise<TicketComment> =>
  apiRequest(`/school/tickets/${ticketId}/comments`, { method: 'POST', body: { body } });

// Account
export const acknowledgePasswordChange = (): Promise<{ mustChangePassword: boolean }> =>
  apiRequest('/me/acknowledge-password-change', { method: 'POST' });

// Question-generation defaults
export const getDefaultBloomDistribution = (): Promise<BloomDistributionResult> =>
  apiRequest('/school/curriculum/default-bloom-distribution');

export const updateDefaultBloomDistribution = (
  distribution: BloomDistribution,
): Promise<BloomDistributionResult> =>
  apiRequest('/school/curriculum/default-bloom-distribution', { method: 'PUT', body: { distribution } });

// School logo
export const getSchoolLogo = (): Promise<SchoolLogoResult> => apiRequest('/school/logo');

export const updateSchoolLogo = (logoDataUri: string | null): Promise<SchoolLogoResult> =>
  apiRequest('/school/logo', { method: 'PUT', body: { logoDataUri } });

// School-wide oversight (read-only) - School Admin observes Teacher-created
// content across the whole school; none of these support create/edit.
export const listSchoolVoiceTests = (params: {
  classId?: string;
  teacherId?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolVoiceTest>> =>
  apiRequest(`/school/voice-tests${toQuery(params)}`);

export const listSchoolHomework = (params: {
  classId?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolHomework>> => apiRequest(`/school/homework${toQuery(params)}`);

export const listSchoolQuestionPapers = (params: {
  subjectId?: string;
  createdBy?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolQuestionPaper>> =>
  apiRequest(`/school/question-papers${toQuery(params)}`);

/** Teachers' Maths challenges (Fix Milo's homework), school-wide. */
export const listSchoolChallenges = (params: {
  classId?: string;
  teacherId?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolChallenge>> => apiRequest(`/school/challenges${toQuery(params)}`);

export const getSchoolLeaderboard = (params: {
  classId?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolLeaderboardEntry>> => apiRequest(`/school/leaderboard${toQuery(params)}`);

export const listSchoolQuestionBank = (params: {
  source?: QuestionBankSource;
  topic?: string;
  collectionName?: string;
  generalBankOnly?: boolean;
  /** Only CUSTOM rows of this own bank. */
  datasetId?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolQuestionBankEntry>> => apiRequest(`/school/question-bank${toQuery(params)}`);

// Global curriculum catalog (read-only) - for building the Chapter ->
// Topic -> Subtopic cascade in the question-bank question form.
/** Only subjects the Super Admin enabled for this school (optionally of one grade). */
export const listSubjects = (grade?: number): Promise<Subject[]> => apiRequestList(`/subjects${toQuery({ grade })}`);

export const listChapters = (subjectId: string, grade?: number): Promise<Chapter[]> =>
  apiRequestList(`/subjects/${subjectId}/chapters${toQuery({ grade })}`);

export const listTopics = (chapterId: string): Promise<Topic[]> =>
  apiRequestList(`/chapters/${chapterId}/topics`);

export const listSubtopics = (topicId: string): Promise<Subtopic[]> =>
  apiRequestList(`/topics/${topicId}/subtopics`);

export const listSchoolAuditLog = (params: {
  q?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolAuditLogEntry>> => apiRequest(`/school/audit-log${toQuery(params)}`);

// Self-service account (the signed-in School Admin's own profile)
export const getSchoolAdminMe = (): Promise<SchoolAdminMe> => apiRequest('/school/me');

export const updateSchoolAdminMe = (input: UpdateSchoolAdminMeInput): Promise<SchoolAdminMe> =>
  apiRequest('/school/me', { method: 'PATCH', body: input });

// Advanced Reporting - see nool-core's src/services/reporting.py
export const listReportDimensions = (): Promise<DimensionSpec[]> => apiRequest('/school/reports/dimensions');

export const runReport = (input: RunReportInput): Promise<ReportResult> =>
  apiRequest('/school/reports/run', { method: 'POST', body: input });

export const listReportConfigs = (): Promise<ReportConfiguration[]> => apiRequestList('/school/reports/configs');

export const createReportConfig = (input: CreateReportConfigurationInput): Promise<ReportConfiguration> =>
  apiRequest('/school/reports/configs', { method: 'POST', body: input });

export const deleteReportConfig = (configId: string): Promise<void> =>
  apiRequest(`/school/reports/configs/${configId}`, { method: 'DELETE' });

export const exportReportConfig = (configId: string, filename: string): Promise<void> =>
  apiDownload(`/school/reports/configs/${configId}/export`, filename);

export const listSharedReports = (): Promise<SharedReport[]> => apiRequestList('/school/reports/shared');

export const runSharedReport = (shareId: string): Promise<ReportResult> =>
  apiRequest(`/school/reports/shared/${shareId}/run`);

export const exportSharedReport = (shareId: string, filename: string): Promise<void> =>
  apiDownload(`/school/reports/shared/${shareId}/export`, filename);
