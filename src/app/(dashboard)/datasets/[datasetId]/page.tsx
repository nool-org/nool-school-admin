'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { AlertIcon, DownloadIcon, UploadIcon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useToast } from '@/components/Toast';
import {
  bulkImportDatasetQuestions,
  createDatasetQuestion,
  deleteDatasetQuestion,
  listChapters,
  listDatasetQuestions,
  listDatasets,
  listSubtopics,
  listTopics,
  updateDatasetQuestion,
} from '@/lib/api';
import { normalizeError } from '@/lib/errors';
import { SearchBox } from '@/components/SearchBox';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlPaginationModel, useUrlParam } from '@/lib/useUrlState';
import {
  BLOOM_LEVELS,
  CHOICE_QUESTION_TYPES,
  DIFFICULTIES,
  QUESTION_TYPES,
  type BloomLevel,
  type DatasetQuestion,
  type DatasetQuestionInput,
  type Difficulty,
  type QuestionImportResult,
  type QuestionType,
  type Subtopic,
  type Topic,
} from '@/lib/types';

const PAGE_SIZE = 25;

const BLOOM_LABEL: Record<BloomLevel, string> = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Create',
};

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  MCQ: 'Multiple choice',
  SHORT_ANSWER: 'Short answer',
  LONG_ANSWER: 'Long answer',
  TRUE_FALSE: 'True / False',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

interface QuestionFormState {
  chapterId: string;
  topicId: string;
  subtopicId: string;
  bloomLevel: BloomLevel | '';
  questionType: QuestionType | '';
  difficulty: Difficulty | '';
  marks: string;
  text: string;
  optionsText: string;
  answer: string;
  solution: string;
}

const EMPTY_FORM: QuestionFormState = {
  chapterId: '',
  topicId: '',
  subtopicId: '',
  bloomLevel: '',
  questionType: '',
  difficulty: '',
  marks: '',
  text: '',
  optionsText: '',
  answer: '',
  solution: '',
};

function parseOptions(optionsText: string): string[] {
  return optionsText
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean);
}

export default function DatasetQuestionsPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const { show } = useToast();

  // Same cache key as the Datasets list page, so arriving from there is instant.
  const datasetsState = useAsyncData('datasets', () => listDatasets());
  const dataset = datasetsState.status === 'success' ? datasetsState.data.find((d) => d.id === datasetId) : undefined;
  // Subject disabled by the platform admin: still viewable, but every write 409s.
  const inactive = dataset?.subjectEnabled === false;
  const readOnly = !dataset?.owned || inactive;
  const subjectName = dataset?.subjectName ?? undefined;

  const chaptersState = useAsyncData(
    dataset?.subjectId ? `chapters:${dataset.subjectId}:${dataset.grade ?? ''}` : null,
    () => listChapters(dataset!.subjectId!, dataset!.grade ?? undefined),
  );
  const chapters = chaptersState.status === 'success' ? chaptersState.data : [];
  const noChapters = chaptersState.status === 'success' && chapters.length === 0;

  const [chapterFilter, setChapterFilter] = useUrlParam('chapter', '');
  const [topicFilter, setTopicFilter] = useUrlParam('topic', '');
  const [subtopicFilter, setSubtopicFilter] = useUrlParam('subtopic', '');
  const [bloomFilter, setBloomFilter] = useUrlParam('bloom', '');
  const [difficultyFilter, setDifficultyFilter] = useUrlParam('difficulty', '');
  const [search, setSearch] = useUrlParam('q', '');
  const [paginationModel, setPaginationModel] = useUrlPaginationModel(PAGE_SIZE);
  const resetPage = () => setPaginationModel({ page: 0, pageSize: paginationModel.pageSize });

  const filterTopicsState = useAsyncData(chapterFilter ? `topics:${chapterFilter}` : null, () =>
    listTopics(chapterFilter),
  );
  const filterSubtopicsState = useAsyncData(topicFilter ? `subtopics:${topicFilter}` : null, () =>
    listSubtopics(topicFilter),
  );

  const state = useAsyncData(
    `dataset-questions:${datasetId}:${chapterFilter}:${topicFilter}:${subtopicFilter}:${bloomFilter}:${difficultyFilter}:${search}:${paginationModel.page}:${paginationModel.pageSize}`,
    () =>
      listDatasetQuestions(datasetId, {
        chapterId: chapterFilter || undefined,
        topicId: topicFilter || undefined,
        subtopicId: subtopicFilter || undefined,
        bloomLevel: (bloomFilter || undefined) as BloomLevel | undefined,
        difficulty: (difficultyFilter || undefined) as Difficulty | undefined,
        q: search || undefined,
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
      }),
  );
  const rows = state.status === 'success' ? state.data.items : [];

  // Deleting the last question on a page leaves it empty while earlier pages
  // still have rows - step back to the last valid page instead of "No questions yet".
  const pageOverflow =
    state.status === 'success' && state.data.items.length === 0 && state.data.total > 0 && paginationModel.page > 0;
  const lastPage = state.status === 'success' ? Math.max(0, Math.ceil(state.data.total / paginationModel.pageSize) - 1) : 0;
  useEffect(() => {
    if (pageOverflow) setPaginationModel({ page: lastPage, pageSize: paginationModel.pageSize });
  }, [pageOverflow, lastPage, paginationModel.pageSize, setPaginationModel]);

  // Topic/subtopic names for the current page only - one request per
  // distinct chapter/topic on the page.
  // ponytail: N small requests per page; add a names endpoint if pages get slow.
  const pageChapterIds = Array.from(new Set(rows.map((r) => r.chapterId).filter((id): id is string => !!id))).sort();
  const pageTopicIds = Array.from(
    new Set(rows.filter((r) => r.subtopicId).map((r) => r.topicId).filter((id): id is string => !!id)),
  ).sort();
  const namesState = useAsyncData(
    rows.length > 0 ? `dataset-question-names:${pageChapterIds.join(',')}|${pageTopicIds.join(',')}` : null,
    async () => {
      const [topicLists, subtopicLists] = await Promise.all([
        Promise.all(pageChapterIds.map((id) => listTopics(id))),
        Promise.all(pageTopicIds.map((id) => listSubtopics(id))),
      ]);
      const names: Record<string, string> = {};
      for (const t of topicLists.flat()) names[t.id] = t.name;
      for (const s of subtopicLists.flat()) names[s.id] = s.name;
      return names;
    },
  );
  const names = namesState.status === 'success' ? namesState.data : {};
  const chapterName = (id: string | null) => (id ? chapters.find((c) => c.id === id)?.name ?? '—' : '—');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DatasetQuestion | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [form, setForm] = useState<QuestionFormState>(EMPTY_FORM);
  const [formTopics, setFormTopics] = useState<Topic[]>([]);
  const [formSubtopics, setFormSubtopics] = useState<Subtopic[]>([]);
  const [formBusy, setFormBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DatasetQuestion | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function loadFormTopics(chapterId: string) {
    setFormTopics([]);
    if (!chapterId) return;
    try {
      setFormTopics(await listTopics(chapterId));
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    }
  }

  async function loadFormSubtopics(topicId: string) {
    setFormSubtopics([]);
    if (!topicId) return;
    try {
      setFormSubtopics(await listSubtopics(topicId));
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    }
  }

  function openCreate() {
    setEditing(null);
    setViewOnly(false);
    setForm(EMPTY_FORM);
    setFormTopics([]);
    setFormSubtopics([]);
    setFormOpen(true);
  }

  function openEdit(question: DatasetQuestion, onlyView: boolean) {
    setEditing(question);
    setViewOnly(onlyView);
    setForm({
      chapterId: question.chapterId ?? '',
      topicId: question.topicId ?? '',
      subtopicId: question.subtopicId ?? '',
      bloomLevel: question.bloomLevel,
      questionType: question.questionType,
      difficulty: question.difficulty ?? '',
      marks: question.marks !== null ? String(question.marks) : '',
      text: question.text,
      optionsText: (question.options ?? []).join('\n'),
      answer: question.answer,
      solution: question.solution ?? '',
    });
    void loadFormTopics(question.chapterId ?? '');
    void loadFormSubtopics(question.topicId ?? '');
    setFormOpen(true);
  }

  const isChoiceType = form.questionType !== '' && CHOICE_QUESTION_TYPES.includes(form.questionType);
  const options = parseOptions(form.optionsText);

  async function handleFormSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.bloomLevel || !form.questionType) return;
    if (isChoiceType && options.length < 2) {
      show('Add at least two options, one per line.', 'error');
      return;
    }
    const payload: DatasetQuestionInput = {
      chapterId: form.chapterId || null,
      topicId: form.topicId || null,
      subtopicId: form.subtopicId || null,
      bloomLevel: form.bloomLevel,
      questionType: form.questionType,
      difficulty: form.difficulty || null,
      marks: form.marks === '' ? null : Number(form.marks),
      text: form.text,
      options: isChoiceType ? options : null,
      answer: form.answer,
      solution: form.solution.trim() || null,
    };
    setFormBusy(true);
    try {
      if (editing) {
        await updateDatasetQuestion(datasetId, editing.id, payload);
        show('Question updated.', 'success');
      } else {
        await createDatasetQuestion(datasetId, payload);
        show('Question added.', 'success');
      }
      setFormOpen(false);
      refreshAll();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setFormBusy(false);
    }
  }

  function refreshAll() {
    if (state.status === 'success') state.refetch();
    // questionCount on the Datasets page.
    if (datasetsState.status === 'success') datasetsState.refetch();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteDatasetQuestion(datasetId, deleteTarget.id);
      show('Question deleted.', 'success');
      setDeleteTarget(null);
      refreshAll();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: GridColDef<DatasetQuestion>[] = [
    { field: 'text', headerName: 'Question', flex: 2, minWidth: 260 },
    {
      field: 'chapterId',
      headerName: 'Chapter',
      flex: 1,
      minWidth: 160,
      valueGetter: (_value, row) => chapterName(row.chapterId),
    },
    {
      field: 'topicId',
      headerName: 'Topic / subtopic',
      flex: 1,
      minWidth: 180,
      valueGetter: (_value, row) => {
        const topic = row.topicId ? names[row.topicId] : undefined;
        const subtopic = row.subtopicId ? names[row.subtopicId] : undefined;
        return [topic, subtopic].filter(Boolean).join(' › ') || '—';
      },
    },
    {
      field: 'bloomLevel',
      headerName: "Bloom's level",
      width: 130,
      valueGetter: (_value, row) => BLOOM_LABEL[row.bloomLevel] ?? row.bloomLevel,
    },
    {
      field: 'difficulty',
      headerName: 'Difficulty',
      width: 110,
      valueGetter: (_value, row) => (row.difficulty ? DIFFICULTY_LABEL[row.difficulty] : '—'),
    },
    {
      field: 'marks',
      headerName: 'Marks',
      width: 90,
      valueGetter: (_value, row) => row.marks ?? '—',
    },
    {
      field: 'questionType',
      headerName: 'Type',
      width: 140,
      valueGetter: (_value, row) => QUESTION_TYPE_LABEL[row.questionType] ?? row.questionType,
    },
    {
      field: 'actions',
      headerName: '',
      width: readOnly ? 100 : 150,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) =>
        readOnly ? (
          <button type="button" className="btn white sm" onClick={() => openEdit(params.row, true)}>
            View
          </button>
        ) : (
          <div className="table-actions">
            <button type="button" className="btn white sm" onClick={() => openEdit(params.row, false)}>
              Edit
            </button>
            <button type="button" className="btn white sm" onClick={() => setDeleteTarget(params.row)}>
              Delete
            </button>
          </div>
        ),
    },
  ];

  if (datasetsState.status === 'loading') {
    return (
      <div className="page">
        <LoadingState label="Loading question bank" />
      </div>
    );
  }
  if (datasetsState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={datasetsState.error} onRetry={datasetsState.retry} />
      </div>
    );
  }
  if (!dataset) {
    return (
      <div className="page">
        <EmptyState title="Dataset not found" message="It may have been deleted, or isn't available to your school." />
        <Link href="/datasets" className="link-btn">
          ← Back to datasets
        </Link>
      </div>
    );
  }

  const hasFilters = !!(chapterFilter || topicFilter || subtopicFilter || bloomFilter || difficultyFilter);
  const formDisabled = viewOnly || readOnly;

  return (
    <div className="page">
      <div className="page-head">
        <Link href="/datasets" className="link-btn">
          ← Datasets
        </Link>
        <div className="page-head-row">
          <h1>{dataset.name}</h1>
          {!readOnly ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn white" onClick={() => setImportOpen(true)}>
                <UploadIcon /> Bulk import
              </button>
              <button type="button" className="btn yellow" onClick={openCreate} disabled={noChapters}>
                + Add question
              </button>
            </div>
          ) : null}
        </div>
        <p className="lead">
          {[subjectName, dataset.grade !== null ? `Class ${dataset.grade}` : null, `${dataset.questionCount} questions`]
            .filter(Boolean)
            .join(' · ')}
          {!dataset.owned
            ? ' - assigned to your school by Nool, so it is read-only here.'
            : ' - your own bank, visible only to your school.'}
          {dataset.description ? ` ${dataset.description}` : ''}
        </p>
      </div>

      {inactive ? (
        <div className="upsell-banner">
          <AlertIcon />
          <span>
            Inactive - subject disabled by your platform admin. You can view these questions, but they&apos;re hidden
            from teachers{dataset.owned ? ' and this bank can’t be edited' : ''} until the subject is re-enabled.
          </span>
        </div>
      ) : null}
      {!readOnly && noChapters ? (
        <div className="upsell-banner">
          <AlertIcon />
          <span>
            No chapters for this subject/grade yet - ask your platform admin to add them before adding questions.
          </span>
        </div>
      ) : null}

      <div className="table-toolbar">
        <SearchBox
          value={search}
          onChange={(next) => {
            setSearch(next);
            resetPage();
          }}
          placeholder="Search question text"
        />
        <select
          className="field"
          style={{ maxWidth: 220 }}
          value={chapterFilter}
          onChange={(e) => {
            setChapterFilter(e.target.value);
            setTopicFilter('');
            setSubtopicFilter('');
            resetPage();
          }}
          aria-label="Filter by chapter"
          disabled={chapters.length === 0}
        >
          <option value="">All chapters</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="field"
          style={{ maxWidth: 220 }}
          value={topicFilter}
          onChange={(e) => {
            setTopicFilter(e.target.value);
            setSubtopicFilter('');
            resetPage();
          }}
          aria-label="Filter by topic"
          disabled={!chapterFilter}
        >
          <option value="">All topics</option>
          {(filterTopicsState.status === 'success' ? filterTopicsState.data : []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="field"
          style={{ maxWidth: 220 }}
          value={subtopicFilter}
          onChange={(e) => {
            setSubtopicFilter(e.target.value);
            resetPage();
          }}
          aria-label="Filter by subtopic"
          disabled={!topicFilter}
        >
          <option value="">All subtopics</option>
          {(filterSubtopicsState.status === 'success' ? filterSubtopicsState.data : []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="field"
          style={{ maxWidth: 180 }}
          value={bloomFilter}
          onChange={(e) => {
            setBloomFilter(e.target.value);
            resetPage();
          }}
          aria-label="Filter by Bloom's level"
        >
          <option value="">All Bloom&apos;s levels</option>
          {BLOOM_LEVELS.map((level) => (
            <option key={level} value={level}>
              {BLOOM_LABEL[level]}
            </option>
          ))}
        </select>
        <select
          className="field"
          style={{ maxWidth: 160 }}
          value={difficultyFilter}
          onChange={(e) => {
            setDifficultyFilter(e.target.value);
            resetPage();
          }}
          aria-label="Filter by difficulty"
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </select>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading questions" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && state.data.items.length === 0 ? (
        pageOverflow ? (
          <LoadingState label="Loading questions" />
        ) : hasFilters ? (
          <EmptyState title="No matching questions" message="Try clearing a filter." />
        ) : readOnly || noChapters ? (
          <EmptyState title="No questions yet" message="This dataset doesn't have any questions yet." />
        ) : (
          <EmptyState
            title="No questions yet"
            message="Add questions one by one, or bulk import a CSV/Excel file."
            actionLabel="Add question"
            onAction={openCreate}
          />
        )
      ) : null}

      {state.status === 'success' && state.data.items.length > 0 ? (
        <DataTable
          rows={state.data.items}
          columns={columns}
          server
          rowCount={state.data.total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      ) : null}

      <Modal
        open={formOpen}
        title={formDisabled ? 'Question' : editing ? 'Edit question' : 'Add question'}
        onClose={() => setFormOpen(false)}
        wide
      >
        <form onSubmit={handleFormSubmit}>
          <fieldset disabled={formDisabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="form-row-inline">
              <div className="form-row">
                <label htmlFor="q-chapter">Chapter</label>
                <select
                  id="q-chapter"
                  className="field"
                  value={form.chapterId}
                  onChange={(e) => {
                    const chapterId = e.target.value;
                    setForm((f) => ({ ...f, chapterId, topicId: '', subtopicId: '' }));
                    setFormSubtopics([]);
                    void loadFormTopics(chapterId);
                  }}
                  required
                >
                  <option value="" disabled>
                    Select a chapter
                  </option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="q-topic">Topic (optional)</label>
                <select
                  id="q-topic"
                  className="field"
                  value={form.topicId}
                  onChange={(e) => {
                    const topicId = e.target.value;
                    setForm((f) => ({ ...f, topicId, subtopicId: '' }));
                    void loadFormSubtopics(topicId);
                  }}
                  disabled={!form.chapterId}
                >
                  <option value="">No specific topic</option>
                  {formTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="q-subtopic">Subtopic (optional)</label>
                <select
                  id="q-subtopic"
                  className="field"
                  value={form.subtopicId}
                  onChange={(e) => setForm((f) => ({ ...f, subtopicId: e.target.value }))}
                  disabled={!form.topicId}
                >
                  <option value="">No specific subtopic</option>
                  {formSubtopics.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row-inline">
              <div className="form-row">
                <label htmlFor="q-bloom">Bloom&apos;s level</label>
                <select
                  id="q-bloom"
                  className="field"
                  value={form.bloomLevel}
                  onChange={(e) => setForm((f) => ({ ...f, bloomLevel: e.target.value as BloomLevel }))}
                  required
                >
                  <option value="" disabled>
                    Select a level
                  </option>
                  {BLOOM_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {BLOOM_LABEL[level]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="q-difficulty">Difficulty (optional)</label>
                <select
                  id="q-difficulty"
                  className="field"
                  value={form.difficulty}
                  onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty | '' }))}
                >
                  <option value="">Not set</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABEL[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="q-marks">Marks (optional)</label>
                <input
                  id="q-marks"
                  className="field"
                  type="number"
                  min={0}
                  max={20}
                  step="any"
                  value={form.marks}
                  onChange={(e) => setForm((f) => ({ ...f, marks: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="q-type">Question type</label>
              <select
                id="q-type"
                className="field"
                value={form.questionType}
                onChange={(e) => {
                  const questionType = e.target.value as QuestionType;
                  setForm((f) => ({
                    ...f,
                    questionType,
                    optionsText: questionType === 'TRUE_FALSE' ? 'True\nFalse' : '',
                    answer: '',
                  }));
                }}
                required
              >
                <option value="" disabled>
                  Select a type
                </option>
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="q-text">Question text</label>
              <textarea
                id="q-text"
                className="field"
                rows={3}
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                required
              />
            </div>

            {isChoiceType ? (
              <>
                <div className="form-row">
                  <label htmlFor="q-options">Options (one per line)</label>
                  <textarea
                    id="q-options"
                    className="field"
                    rows={4}
                    value={form.optionsText}
                    onChange={(e) => {
                      const optionsText = e.target.value;
                      // Drop a picked answer that no longer matches any option.
                      setForm((f) => ({
                        ...f,
                        optionsText,
                        answer: parseOptions(optionsText).includes(f.answer) ? f.answer : '',
                      }));
                    }}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="q-answer-choice">Correct answer</label>
                  <select
                    id="q-answer-choice"
                    className="field"
                    value={form.answer}
                    onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                    required
                  >
                    <option value="" disabled>
                      Select the correct option
                    </option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            {form.questionType === 'SHORT_ANSWER' || form.questionType === 'LONG_ANSWER' ? (
              <div className="form-row">
                <label htmlFor="q-answer-text">Reference answer</label>
                <textarea
                  id="q-answer-text"
                  className="field"
                  rows={form.questionType === 'LONG_ANSWER' ? 4 : 2}
                  value={form.answer}
                  onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                  required
                />
              </div>
            ) : null}

            <div className="form-row">
              <label htmlFor="q-solution">Solution / explanation (optional)</label>
              <textarea
                id="q-solution"
                className="field"
                rows={3}
                value={form.solution}
                onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
              />
            </div>
          </fieldset>

          <div className="modal-actions">
            <button type="button" className="btn white" onClick={() => setFormOpen(false)}>
              {formDisabled ? 'Close' : 'Cancel'}
            </button>
            {!formDisabled ? (
              <button type="submit" className="btn dark" disabled={formBusy}>
                {formBusy ? 'Saving…' : editing ? 'Save changes' : 'Add question'}
              </button>
            ) : null}
          </div>
        </form>
      </Modal>

      <QuestionImportModal
        datasetId={datasetId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refreshAll}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this question?"
        message={deleteTarget ? `"${deleteTarget.text}" will be permanently removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function downloadTemplate() {
  const rows = [
    ['chapter', 'topic', 'subtopic', 'bloomLevel', 'questionType', 'difficulty', 'marks', 'text', 'options', 'answer', 'solution'],
    [
      '11', '11.6', '', 'REMEMBER', 'MCQ', 'EASY', '1', 'What is the SI unit of electric current?', 'ohm|volt|ampere',
      'ampere', 'Current is measured in amperes.',
    ],
    [
      'Electricity', 'Ohm\'s Law', '', 'APPLY', 'SHORT_ANSWER', 'MEDIUM', '3',
      'A 2 ohm resistor carries 3 A. What is the voltage across it?', '', '6 V', 'V = IR = 3 x 2 = 6 V.',
    ],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'question-bank-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function QuestionImportModal({
  datasetId,
  open,
  onClose,
  onImported,
}: {
  datasetId: string;
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const { show } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuestionImportResult | null>(null);

  function handleClose() {
    setFile(null);
    setResult(null);
    onClose();
  }

  async function handleUpload() {
    if (!file) return;
    setSubmitting(true);
    try {
      const imported = await bulkImportDatasetQuestions(datasetId, file);
      setResult(imported);
      if (imported.createdCount > 0) onImported();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Bulk import questions" onClose={handleClose} wide>
      {!result ? (
        <>
          <button type="button" className="link-btn" style={{ marginBottom: 16 }} onClick={downloadTemplate}>
            <DownloadIcon /> Download CSV template
          </button>
          <div className="file-drop">
            <input
              type="file"
              accept=".csv,.xlsx"
              disabled={submitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p style={{ marginTop: 10 }}>
              Accepts .csv or .xlsx, up to 500 rows (2 MB). Columns: chapter, topic, subtopic, bloomLevel,
              questionType, difficulty, marks, text, options, answer, solution. Chapter/topic/subtopic match by name
              or by book number (e.g. 11, 11.6, 11.6.1). Options are pipe-separated (only for MCQ/TRUE_FALSE) and the
              answer must match one of them. Subject and class come from this bank.
            </p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn white" onClick={handleClose}>
              Cancel
            </button>
            <button type="button" className="btn yellow" disabled={!file || submitting} onClick={() => void handleUpload()}>
              <UploadIcon /> {submitting ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="bulk-summary">
            <div className="stat">
              <small>Created</small>
              <strong style={{ color: 'var(--color-green)' }}>{result.createdCount}</strong>
            </div>
            <div className="stat">
              <small>Failed</small>
              <strong style={{ color: result.errorCount > 0 ? 'var(--color-red)' : undefined }}>
                {result.errorCount}
              </strong>
            </div>
          </div>
          <div className="bulk-results">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>
                      {row.status === 'created' ? (
                        <span style={{ color: 'var(--color-green)' }}>Created</span>
                      ) : (
                        <span style={{ color: 'var(--color-red)' }}>{row.error ?? row.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn dark" onClick={handleClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
