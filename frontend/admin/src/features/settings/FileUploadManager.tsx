import { useRef, useState } from 'react';
import { Button, Card, EmptyState, PageHeader, Spinner, Table, useCrud, type CrudConfig } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { asStr, formatDateTime, formatFileSize } from '@/lib/format';

export interface UploadRow {
  id: string;
  name: string;
  size?: number;
  url?: string;
  uploadedAt?: string;
}

function toUploadRows(data: unknown): UploadRow[] {
  const list = Array.isArray(data)
    ? data
    : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? [];
  return (Array.isArray(list) ? list : []).map((r) => {
    const rec = r as Record<string, unknown>;
    const url = asStr(rec, 'url') !== '—' ? asStr(rec, 'url') : asStr(rec, 'path') !== '—' ? asStr(rec, 'path') : asStr(rec, 'location');
    return {
      id: String(rec.id ?? rec._id ?? rec.filename ?? rec.key ?? url ?? ''),
      name:
        asStr(rec, 'name') !== '—'
          ? asStr(rec, 'name')
          : asStr(rec, 'filename') !== '—'
            ? asStr(rec, 'filename')
            : asStr(rec, 'originalName') !== '—'
              ? asStr(rec, 'originalName')
              : url !== '—'
                ? String(url).split('/').pop() ?? 'Uploaded file'
                : 'Uploaded file',
      size: typeof rec.size === 'number' ? rec.size : rec.size ? Number(rec.size) : undefined,
      url: url !== '—' ? url : undefined,
      uploadedAt: asStr(rec, 'uploadedAt') !== '—' ? asStr(rec, 'uploadedAt') : asStr(rec, 'createdAt'),
    } as UploadRow;
  });
}

export function FileUploadManager() {
  const { rows, loading, error, refresh, remove } = useCrud<UploadRow, CrudConfig<UploadRow>>({
    endpoint: '/uploads',
    transform: toUploadRows,
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onPick = (file: File | undefined) => {
    setMessage(null);
    setFileName(file ? file.name : '');
  };

  const upload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage({ kind: 'error', text: 'Choose a file to upload first.' });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const json = await apiFetch('/api/uploads', { method: 'POST', body: fd });
      const rec = (json ?? {}) as Record<string, unknown>;
      const uploaded = toUploadRows(rec);
      const name = uploaded[0]?.name ?? file.name;
      setMessage({ kind: 'success', text: `Uploaded "${name}".` });
      setFileName('');
      if (inputRef.current) inputRef.current.value = '';
      await refresh();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message || 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (row: UploadRow) => {
    setDeletingId(row.id);
    setMessage(null);
    const ok = await remove(row.id);
    if (ok) setMessage({ kind: 'success', text: `Deleted "${row.name}".` });
    setDeletingId(null);
  };

  return (
    <div>
      <PageHeader title="File Uploads" subtitle="Upload and manage files served by the CDN." />

      <Card className="mb-6">
        <h2 className="mb-3 text-base font-semibold">Upload a file</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => onPick(e.target.files?.[0])}
            className="block w-full max-w-sm text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0875FF]/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#0875FF] hover:file:bg-[#0875FF]/20"
          />
          <Button onClick={() => void upload()} disabled={uploading || !fileName}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          {fileName ? <span className="text-sm text-slate-500">{fileName}</span> : null}
        </div>
        {message ? (
          <div
            className={`mt-3 rounded-lg border p-3 text-sm ${
              message.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        ) : null}
      </Card>

      {loading ? <Spinner /> : null}
      {!loading && (error || deletingId) ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState title="No uploaded files" />
        </div>
      ) : (
        <Table<UploadRow>
          rows={rows}
          onDelete={(r) => void removeFile(r)}
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'size', header: 'Size', render: (r) => formatFileSize(r.size) },
            {
              key: 'url',
              header: 'URL',
              render: (r) =>
                r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="max-w-56 truncate inline-block text-[#0875FF] hover:underline"
                    title={r.url}
                  >
                    {r.url}
                  </a>
                ) : (
                  '—'
                ),
            },
            { key: 'uploadedAt', header: 'Uploaded', render: (r) => formatDateTime(r.uploadedAt) },
          ]}
        />
      )}
    </div>
  );
}

export default FileUploadManager;