'use client';

import { useEffect, useState } from 'react';

import { Modal } from './Modal';
import { getGradeSubjects, listSubjects } from '@/lib/api';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import {
  subjectLabel,
  type ClassAssignment,
  type SchoolAdminClass,
  type SchoolTeacher,
  type ScienceBranch,
} from '@/lib/types';

interface Row {
  teacherId: string;
  subjectId: string;
  branch: ScienceBranch | null;
}

const BRANCHES: { value: ScienceBranch; label: string }[] = [
  { value: 'PHYSICS', label: 'Physics chapters' },
  { value: 'CHEMISTRY', label: 'Chemistry chapters' },
  { value: 'BIOLOGY', label: 'Biology chapters' },
];

/**
 * Backs the literal "assign a class to teacher" ask (PUT
 * /school/classes/{id}/assignments). Subjects offered are only those enabled
 * for this school *in this class's grade* (GET /school/grades/{id}/subjects) -
 * anything else is refused server-side with a 422. Saved rows whose subject
 * or teacher is no longer valid are flagged and must be removed before saving.
 */
export function AssignClassModal({
  open,
  schoolClass,
  gradeId,
  teachers,
  onSave,
  onClose,
}: {
  open: boolean;
  schoolClass: SchoolAdminClass | null;
  /** The SchoolGrade row for schoolClass.grade - null falls back to GET /subjects?grade=. */
  gradeId: string | null;
  teachers: SchoolTeacher[];
  onSave: (classId: string, assignments: ClassAssignment[]) => Promise<unknown>;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const grade = schoolClass?.grade;
  const subjectsState = useAsyncData(
    schoolClass ? `assign-subjects:${gradeId ?? `g${grade}`}` : null,
    async () =>
      gradeId ? (await getGradeSubjects(gradeId)).subjects.filter((s) => s.enabled) : listSubjects(grade),
  );
  const subjects = subjectsState.status === 'success' ? subjectsState.data : [];
  const assignableTeachers = teachers.filter((t) => t.status !== 'DEACTIVATED');

  useEffect(() => {
    if (schoolClass) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding local editable rows from the class prop whenever a different class is opened is the intended behavior, not a render-derived value.
      setRows(
        schoolClass.assignments.map((a) => ({
          teacherId: a.teacherId,
          subjectId: a.subjectId,
          branch: a.branch ?? null,
        })),
      );
      setFormError(null);
    }
  }, [schoolClass]);

  if (!schoolClass) return null;
  const currentClass = schoolClass;

  /** Why a (saved) row can't be saved any more - its subject isn't assignable in
   * this grade, or its teacher was deactivated/removed. null = row is fine. */
  function staleReason(row: Row): string | null {
    if (subjectsState.status !== 'success') return null;
    const subject = subjects.find((s) => s.id === row.subjectId);
    const teacher = assignableTeachers.find((t) => t.id === row.teacherId);
    const badSubject = row.subjectId !== '' && !subject;
    const badTeacher = row.teacherId !== '' && !teacher;
    if (!badSubject && !badTeacher) return null;
    const teacherName = teachers.find((t) => t.id === row.teacherId)?.displayName ?? 'Removed teacher';
    return [
      badTeacher ? `${teacherName} (deactivated)` : teacherName,
      subject ? subjectLabel(subject) : `subject not assigned to Class ${currentClass.grade}`,
    ].join(' · ');
  }
  const staleCount = rows.filter((r) => staleReason(r) !== null).length;

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  function addRow() {
    // Start empty - the admin must pick both explicitly.
    setRows((current) => [...current, { teacherId: '', subjectId: '', branch: null }]);
  }

  async function handleSave() {
    if (staleCount > 0) {
      setFormError('Remove the rows marked "No longer available" before saving.');
      return;
    }
    if (rows.some((r) => !r.teacherId || !r.subjectId)) {
      setFormError('Pick a teacher and a subject for every row (or remove it).');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onSave(currentClass.id, rows);
      onClose();
    } catch (cause) {
      setFormError(normalizeError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`Assign teachers - Class ${currentClass.grade} · ${currentClass.section}`}
      onClose={onClose}
      wide
    >
      {subjectsState.status === 'loading' ? <p style={{ marginBottom: 16 }}>Loading subjects…</p> : null}
      {subjectsState.status === 'error' ? (
        <p style={{ color: 'var(--color-red)', marginBottom: 16 }}>{subjectsState.error.message}</p>
      ) : null}
      {subjectsState.status === 'success' && subjects.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', marginBottom: 16 }}>
          No subjects are assigned to Class {currentClass.grade} yet - ask your platform admin.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p style={{ marginBottom: 16 }}>No subjects assigned yet. Add a row to get started.</p>
      ) : (
        rows.map((row, index) => {
          const stale = staleReason(row);
          return (
            <div key={index} className="assign-row">
              {stale ? (
                <span style={{ flex: 1, color: 'var(--color-red)' }}>
                  No longer available - remove
                  <small style={{ display: 'block', color: 'var(--color-muted)' }}>{stale}</small>
                </span>
              ) : (
                <>
                  <select
                    className="field"
                    value={row.teacherId}
                    onChange={(e) => updateRow(index, { teacherId: e.target.value })}
                  >
                    <option value="" disabled>
                      Select teacher
                    </option>
                    {assignableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.status === 'PENDING' ? `${t.displayName} (pending - hasn't signed in yet)` : t.displayName}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field"
                    value={row.subjectId}
                    onChange={(e) => updateRow(index, { subjectId: e.target.value, branch: null })}
                  >
                    <option value="" disabled>
                      Select subject
                    </option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {subjectLabel(s)}
                      </option>
                    ))}
                  </select>
                  {/* Science can be split between up to 3 teachers, one branch each */}
                  {subjects.find((s) => s.id === row.subjectId)?.name === 'Science' ? (
                    <select
                      className="field"
                      aria-label="Chapters"
                      value={row.branch ?? ''}
                      onChange={(e) =>
                        updateRow(index, { branch: (e.target.value || null) as ScienceBranch | null })
                      }
                    >
                      <option value="">All chapters</option>
                      {BRANCHES.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </>
              )}
              <button type="button" className="remove-row-btn" aria-label="Remove" onClick={() => removeRow(index)}>
                ✕
              </button>
            </div>
          );
        })
      )}

      <button
        type="button"
        className="add-row-btn"
        onClick={addRow}
        disabled={assignableTeachers.length === 0 || subjects.length === 0}
      >
        + Add teacher / subject
      </button>

      {staleCount > 0 ? (
        <p style={{ color: 'var(--color-red)', marginTop: 12 }}>
          Remove the {staleCount === 1 ? 'row' : `${staleCount} rows`} marked &quot;No longer available&quot; to save.
        </p>
      ) : null}
      {formError ? <p style={{ color: 'var(--color-red)', marginTop: 12 }}>{formError}</p> : null}

      <div className="modal-actions">
        <button type="button" className="btn white" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn dark"
          disabled={submitting || staleCount > 0 || subjectsState.status !== 'success'}
          onClick={() => void handleSave()}
        >
          {submitting ? 'Saving…' : 'Save assignments'}
        </button>
      </div>
    </Modal>
  );
}
