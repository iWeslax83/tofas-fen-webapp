import {
  usePendingBatches,
  useActivateBatch,
  useRegenerateBatch,
  useCancelBatch,
} from './hooks/useBulkImport';

export default function PendingBatchesList({
  onRegenerated,
}: {
  onRegenerated?: (filename: string) => void;
}) {
  const { data: batches = [], isLoading } = usePendingBatches();
  const activate = useActivateBatch();
  const regen = useRegenerateBatch();
  const cancel = useCancelBatch();

  if (isLoading) return <p>Yükleniyor...</p>;
  if (batches.length === 0) return <p className="text-[var(--ink-dim)]">Bekleyen batch yok.</p>;

  return (
    <div className="space-y-3">
      {batches.map((b) => (
        <div
          key={b.batchId}
          className="border border-[var(--rule)] bg-[var(--surface)] rounded p-3"
        >
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="font-mono text-xs text-[var(--ink-dim)]">{b.batchId}</p>
              <p className="text-sm text-[var(--ink)]">
                <span className="font-medium">{b.totalCount}</span> kullanıcı,{' '}
                {new Date(b.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => activate.mutate(b.batchId)}
              disabled={activate.isPending}
              className="px-3 py-1.5 bg-[var(--ok)] text-white rounded text-sm hover:opacity-90 disabled:opacity-50"
            >
              Aktif Et
            </button>
            <button
              onClick={() =>
                regen.mutate(b.batchId, {
                  onSuccess: (res) => {
                    // N-C1: follow downloadUrl instead of decoding base64
                    if (res.downloadUrl) {
                      window.location.href = res.downloadUrl;
                    }
                    onRegenerated?.(res.credentialsFilename);
                  },
                })
              }
              disabled={regen.isPending}
              className="px-3 py-1.5 bg-[var(--state)] text-white rounded text-sm hover:bg-[var(--state-deep)] disabled:opacity-50"
            >
              Şifreleri Yeniden Üret
            </button>
            <button
              onClick={() => {
                if (confirm('Bu batch ve içindeki tüm kullanıcılar silinecek. Emin misiniz?')) {
                  cancel.mutate(b.batchId);
                }
              }}
              disabled={cancel.isPending}
              className="px-3 py-1.5 bg-[var(--state)] text-white rounded text-sm hover:bg-[var(--state-deep)] disabled:opacity-50"
            >
              İptal Et
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
