'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { SearchIcon } from '@/components/Icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { listDatasets, listSchoolQuestionBank } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlPaginationModel, useUrlParam } from '@/lib/useUrlState';
import { GENERAL_BANK_NAME, type QuestionBankSource, type SchoolQuestionBankEntry } from '@/lib/types';

const PAGE_SIZE = 25;

const BLOOM_LABEL: Record<string, string> = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Create',
};

function sourceTagVariant(source: QuestionBankSource): string {
  if (source === 'QUESTION_PAPER') return 'purple';
  if (source === 'CUSTOM') return 'green';
  return 'yellow';
}

function sourceLabel(source: QuestionBankSource): string {
  if (source === 'QUESTION_PAPER') return 'Question Paper';
  if (source === 'CUSTOM') return 'Your bank';
  return 'Homework';
}

export default function QuestionBankPage() {
  const [source, setSource] = useUrlParam('source', '');
  const [topic, setTopic] = useUrlParam('topic', '');
  // An own bank's datasetId ('' = all) - names aren't unique across subjects/grades.
  const [bankFilter, setBankFilter] = useUrlParam('bank', '');
  const [paginationModel, setPaginationModel] = useUrlPaginationModel(PAGE_SIZE);
  const [topicInput, setTopicInput] = useState(topic);

  // Same cache key as the Datasets page.
  const datasetsState = useAsyncData('datasets', () => listDatasets());
  const ownBanks = datasetsState.status === 'success' ? datasetsState.data.filter((d) => d.owned) : [];
  // The "General bank" is just another own bank, so it's listed only if it exists.
  const bankOptions = ownBanks
    .map((d) => ({
      id: d.id,
      label: [d.name, d.subjectName, d.grade !== null ? `Class ${d.grade}` : null].filter(Boolean).join(' · '),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  useEffect(() => {
    const handle = setTimeout(() => {
      if (topicInput !== topic) {
        setTopic(topicInput);
        setPaginationModel({ page: 0, pageSize: PAGE_SIZE });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the debounced input value itself changes.
  }, [topicInput]);

  const state = useAsyncData(
    `question-bank:${source}:${topic}:${bankFilter}:${paginationModel.page}:${paginationModel.pageSize}`,
    () =>
      listSchoolQuestionBank({
        source: (source || undefined) as QuestionBankSource | undefined,
        topic: topic || undefined,
        datasetId: bankFilter || undefined,
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
      }),
  );

  // CUSTOM rows carry the id of the school bank they're in.
  function bankHref(entry: SchoolQuestionBankEntry): string | null {
    return entry.datasetId ? `/datasets/${entry.datasetId}` : null;
  }

  const columns: GridColDef<SchoolQuestionBankEntry>[] = [
    { field: 'text', headerName: 'Question', flex: 2, minWidth: 260 },
    { field: 'topicLabel', headerName: 'Topic', flex: 1, minWidth: 160 },
    { field: 'subjectName', headerName: 'Subject', width: 140 },
    {
      field: 'bloomLevel',
      headerName: "Bloom's level",
      width: 130,
      valueGetter: (_value, row) => BLOOM_LABEL[row.bloomLevel] ?? row.bloomLevel,
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 130,
      renderCell: (params) => (
        <span className={`tag ${sourceTagVariant(params.row.source)}`}>{sourceLabel(params.row.source)}</span>
      ),
    },
    { field: 'sourceName', headerName: 'From', flex: 1, minWidth: 160 },
    {
      field: 'collectionName',
      headerName: 'Bank',
      flex: 1,
      minWidth: 140,
      valueGetter: (_value, row) =>
        row.source === 'CUSTOM' ? row.collectionName ?? GENERAL_BANK_NAME : '—',
    },
    {
      field: 'answer',
      headerName: 'Answer',
      flex: 1,
      minWidth: 200,
      valueGetter: (_value, row) => row.answer ?? '—',
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => {
        const href = params.row.source === 'CUSTOM' ? bankHref(params.row) : null;
        return href ? (
          <Link href={href} className="btn white sm">
            Open bank
          </Link>
        ) : null;
      },
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Question bank</h1>
          <Link href="/datasets" className="btn yellow">
            Manage question banks
          </Link>
        </div>
        <p className="lead">
          Every question your teachers have generated, plus the ones in your own question banks - pulled from
          Question Papers, Homework, and your banks. This view is read-only: add or edit your own questions from
          the bank itself (Datasets).
        </p>
      </div>

      <div className="table-toolbar">
        <div className="search-field" style={{ maxWidth: 280 }}>
          <SearchIcon />
          <input
            type="search"
            placeholder="Search by topic"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            aria-label="Search by topic"
          />
        </div>
        <select
          className="field"
          style={{ maxWidth: 240 }}
          value={source}
          onChange={(e) => {
            setSource(e.target.value as QuestionBankSource | '');
            setPaginationModel({ page: 0, pageSize: PAGE_SIZE });
          }}
        >
          <option value="">All sources</option>
          <option value="QUESTION_PAPER">Question Papers</option>
          <option value="HOMEWORK">Homework</option>
          <option value="CUSTOM">Your banks</option>
        </select>
        <select
          className="field"
          style={{ maxWidth: 240 }}
          value={bankFilter}
          aria-label="Filter by bank"
          onChange={(e) => {
            setBankFilter(e.target.value);
            setPaginationModel({ page: 0, pageSize: PAGE_SIZE });
          }}
        >
          <option value="">All banks</option>
          {bankOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading question bank" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && state.data.items.length === 0 ? (
        <EmptyState
          title="No questions yet"
          message="Once teachers generate Question Papers or Homework - or you add questions to your own banks - every question shows up here."
        />
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
    </div>
  );
}
