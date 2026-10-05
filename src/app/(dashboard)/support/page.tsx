'use client';

import { useEffect, useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useToast } from '@/components/Toast';
import { createSupportTicket, createTicketComment, listSupportTickets, listTicketComments } from '@/lib/api';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import type { SupportTicket, TicketComment, TicketStatus } from '@/lib/types';

function statusTagVariant(status: TicketStatus): string {
  if (status === 'RESOLVED') return 'green';
  if (status === 'IN_PROGRESS') return 'yellow';
  return 'red';
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
};

/**
 * File and track support issues with noolAI - an internal-only tracker
 * replacing the previously untracked "email/call when something's
 * broken" side-channel. No email/Slack integration by design for this
 * first version - noolAI works these from the Super Admin console's own
 * Support tickets inbox.
 */
export default function SupportPage() {
  const { show } = useToast();
  const state = useAsyncData('support-tickets', () => listSupportTickets());

  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailTarget, setDetailTarget] = useState<SupportTicket | null>(null);
  const [comments, setComments] = useState<TicketComment[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  useEffect(() => {
    if (!detailTarget) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- this effect *is* the data fetch, triggered by opening the modal; resetting to loading is the intended behavior, not a render-derived value.
    setCommentsLoading(true);
    listTicketComments(detailTarget.id)
      .then((result) => {
        if (!cancelled) setComments(result);
      })
      .catch((cause) => {
        if (!cancelled) show(normalizeError(cause).message, 'error');
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `show` is stable from context, not a dependency that should re-trigger this fetch.
  }, [detailTarget]);

  function openCreate() {
    setSubject('');
    setDescription('');
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createSupportTicket({ subject, description });
      setCreateOpen(false);
      show('Ticket filed.');
      if (state.status === 'success') state.refetch();
    } catch (cause) {
      setCreateError(normalizeError(cause).message);
    } finally {
      setCreating(false);
    }
  }

  function closeDetail() {
    setDetailTarget(null);
    setComments(null);
    setReplyText('');
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!detailTarget || !replyText.trim()) return;
    setReplyBusy(true);
    try {
      const comment = await createTicketComment(detailTarget.id, replyText.trim());
      setComments((current) => (current ? [...current, comment] : [comment]));
      setReplyText('');
      if (state.status === 'success') state.refetch();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setReplyBusy(false);
    }
  }

  const columns: GridColDef<SupportTicket>[] = [
    { field: 'subject', headerName: 'Subject', flex: 1.4, minWidth: 220 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <span className={`tag ${statusTagVariant(params.row.status)}`}>{STATUS_LABEL[params.row.status]}</span>
      ),
    },
    { field: 'commentCount', headerName: 'Replies', width: 90 },
    {
      field: 'createdAt',
      headerName: 'Filed',
      width: 170,
      valueGetter: (_value, row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      field: 'actions',
      headerName: '',
      width: 120,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => (
        <button type="button" className="btn white sm" onClick={() => setDetailTarget(params.row)}>
          View
        </button>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Support</h1>
          <button type="button" className="btn yellow" onClick={openCreate}>
            + New ticket
          </button>
        </div>
        <p className="lead">File an issue with noolAI and track it here - no need for a separate email thread.</p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading tickets" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && state.data.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          message="File your first support ticket and noolAI will follow up here."
          actionLabel="New ticket"
          onAction={openCreate}
        />
      ) : null}

      {state.status === 'success' && state.data.length > 0 ? <DataTable rows={state.data} columns={columns} /> : null}

      <Modal open={createOpen} title="New support ticket" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <label htmlFor="ticket-subject">Subject</label>
            <input
              id="ticket-subject"
              className="field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="ticket-description">Description</label>
            <textarea
              id="ticket-description"
              className="field"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          {createError ? <p style={{ color: 'var(--color-red)' }}>{createError}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn white" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn dark" disabled={creating}>
              {creating ? 'Filing…' : 'File ticket'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={detailTarget !== null} title={detailTarget?.subject ?? 'Ticket'} onClose={closeDetail}>
        {detailTarget ? (
          <>
            <div className="checkrow" style={{ paddingTop: 0, marginBottom: 12 }}>
              <span style={{ color: 'var(--color-muted)' }}>
                Filed {new Date(detailTarget.createdAt).toLocaleString()}
              </span>
              <span className={`tag ${statusTagVariant(detailTarget.status)}`} style={{ marginLeft: 'auto' }}>
                {STATUS_LABEL[detailTarget.status]}
              </span>
            </div>
            <p style={{ marginBottom: 16, whiteSpace: 'pre-wrap' }}>{detailTarget.description}</p>

            <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Replies</h3>
              {commentsLoading ? <LoadingState label="Loading replies" /> : null}
              {!commentsLoading && comments && comments.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', marginBottom: 16 }}>
                  No replies yet - noolAI will respond here.
                </p>
              ) : null}
              {!commentsLoading && comments && comments.length > 0 ? (
                <div className="panel-list" style={{ marginBottom: 16 }}>
                  {comments.map((c) => (
                    <div key={c.id} className="panel-list-row" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <div className="name">{c.authorName}</div>
                        <div className="sub" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
                      </div>
                      <span className="sub">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <form onSubmit={handleReply}>
                <div className="form-row">
                  <label htmlFor="ticket-reply">Add a reply</label>
                  <textarea
                    id="ticket-reply"
                    className="field"
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn dark" disabled={replyBusy || !replyText.trim()}>
                    {replyBusy ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
