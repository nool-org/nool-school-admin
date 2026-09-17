import { apiDownload, apiRequest, apiRequestList, apiUpload } from './apiClient';
import type {
  BloomDistribution,
  BloomDistributionResult,
  BloomLevel,
  BulkImportResult,
  ClassAssignment,
  CreateClassInput,
  CreateGradeInput,
  CreateReportConfigurationInput,
  CreateStudentInput,
  CreateStudentResult,
  CustomQuestionCollectionSummary,
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
  SchoolHomework,
  Chapter,
  CreateCustomQuestionInput,
  CustomQuestion,
  QuestionType,
  SchoolLeaderboardEntry,
  SchoolLogoResult,
  Subject,
  Topic,
  UpdateCustomQuestionInput,
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

export const getGradeSubjects = (gradeId: string): Promise<GradeSubjects> =>
  apiRequest(`/school/grades/${gradeId}/subjects`);

export const updateGradeSubjects = (gradeId: string, subjectIds: string[]): Promise<GradeSubjects> =>
  apiRequest(`/school/grades/${gradeId}/subjects`, { method: 'PUT', body: { subjectIds } });

// Curriculum
// Read-only for School Admin - assignment is exclusively Super Admin's
// job now (see nool-core's school_admin.py get_school_curriculum
// docstring; PUT /school/curriculum no longer exists).
export const getCurriculum = (): Promise<SchoolCurriculum> => apiRequest('/school/curriculum');

// Datasets - enable/disable only; creation and editing are Super-Admin-only
// (global catalog), see spec/docs for why.
export const listDatasets = (): Promise<SchoolDataset[]> => apiRequestList('/school/datasets');

export const updateDatasets = (datasetIds: string[]): Promise<SchoolDataset[]> =>
  apiRequestList('/school/datasets', { method: 'PUT', body: { datasetIds } });

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
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolVoiceTest>> =>
  apiRequest(`/school/voice-tests${toQuery(params)}`);

export const listSchoolHomework = (params: {
  classId?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolHomework>> => apiRequest(`/school/homework${toQuery(params)}`);

export const listSchoolQuestionPapers = (params: {
  subjectId?: string;
  createdBy?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolQuestionPaper>> =>
  apiRequest(`/school/question-papers${toQuery(params)}`);

export const getSchoolLeaderboard = (params: {
  classId?: string;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolLeaderboardEntry>> => apiRequest(`/school/leaderboard${toQuery(params)}`);

export const listSchoolQuestionBank = (params: {
  source?: QuestionBankSource;
  topic?: string;
  collectionName?: string;
  generalBankOnly?: boolean;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<SchoolQuestionBankEntry>> => apiRequest(`/school/question-bank${toQuery(params)}`);

// Global curriculum catalog (read-only) - for building the Subject ->
// Chapter -> Topic cascade in the "Add custom question" form.
export const listSubjects = (): Promise<Subject[]> => apiRequestList('/subjects');

export const listChapters = (subjectId: string): Promise<Chapter[]> =>
  apiRequestList(`/subjects/${subjectId}/chapters`);

export const listTopics = (chapterId: string): Promise<Topic[]> =>
  apiRequestList(`/chapters/${chapterId}/topics`);

// Custom questions
export const listCustomQuestions = (params: {
  classId?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  bloomLevel?: BloomLevel;
  questionType?: QuestionType;
  collectionName?: string;
  generalBankOnly?: boolean;
  limit: number;
  offset: number;
}): Promise<PageEnvelope<CustomQuestion>> => apiRequest(`/school/custom-questions${toQuery(params)}`);

export const getCustomQuestion = (questionId: string): Promise<CustomQuestion> =>
  apiRequest(`/school/custom-questions/${questionId}`);

export const createCustomQuestion = (input: CreateCustomQuestionInput): Promise<CustomQuestion> =>
  apiRequest('/school/custom-questions', { method: 'POST', body: input });

export const updateCustomQuestion = (
  questionId: string,
  input: UpdateCustomQuestionInput,
): Promise<CustomQuestion> => apiRequest(`/school/custom-questions/${questionId}`, { method: 'PATCH', body: input });

export const deleteCustomQuestion = (questionId: string): Promise<void> =>
  apiRequest(`/school/custom-questions/${questionId}`, { method: 'DELETE' });

export const bulkImportCustomQuestions = (file: File): Promise<BulkImportResult> =>
  apiUpload('/school/custom-questions/bulk-import', file);

export const listCustomQuestionCollections = (): Promise<string[]> =>
  apiRequest('/school/custom-questions/collections');

export const getCustomQuestionCollectionsSummary = (): Promise<CustomQuestionCollectionSummary[]> =>
  apiRequest('/school/custom-questions/collections/summary');

export const listSchoolAuditLog = (params: {
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
