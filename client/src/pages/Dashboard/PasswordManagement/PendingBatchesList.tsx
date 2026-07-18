import { Button } from '../../../components/ui/Button';
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

  if (isLoading) return <p className="text-xs font-medium text-[var(--ink-dim)]">Yükleniyor...</p>;
  if (batches.length === 0)
    return <p className="font-serif text-xs text-[var(--ink-dim)]">Bekleyen yükleme yok.</p>;

  return (
    <div className="space-y-3">
      {batches.map((b) => (
        <div key={b.batchId} className="border border-[var(--rule)] bg-[var(--surface)] p-3">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-xs font-medium text-[var(--ink-dim)]">{b.batchId}</p>
              <p className="font-serif text-sm text-[var(--ink)] mt-0.5">
                <span className="font-medium">{b.totalCount}</span> kullanıcı,{' '}
                <span className="font-mono text-xs text-[var(--ink-dim)]">
                  {new Date(b.createdAt).toLocaleString('tr-TR')}
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => activate.mutate(b.batchId)}
              loading={activate.isPending}
            >
              Aktif Et
            </Button>
            <Button
              variant="secondary"
              size="sm"
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
              loading={regen.isPending}
            >
              Şifreleri Yeniden Üret
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Bu yükleme ve içindeki tüm kullanıcılar silinecek. Emin misiniz?')) {
                  cancel.mutate(b.batchId);
                }
              }}
              loading={cancel.isPending}
            >
              İptal Et
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
