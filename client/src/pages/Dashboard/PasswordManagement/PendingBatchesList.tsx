import {
  usePendingBatches,
  useActivateBatch,
  useRegenerateBatch,
  useCancelBatch,
} from './hooks/useBulkImport';
import { downloadBase64File } from './downloadBase64';

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
  if (batches.length === 0) return <p className="text-gray-500">Bekleyen batch yok.</p>;

  return (
    <div className="space-y-3">
      {batches.map((b) => (
        <div key={b.batchId} className="border border-amber-300 bg-amber-50 rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="font-mono text-xs text-gray-600">{b.batchId}</p>
              <p className="text-sm">
                <span className="font-medium">{b.totalCount}</span> kullanıcı,{' '}
                {new Date(b.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => activate.mutate(b.batchId)}
              disabled={activate.isPending}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              Aktif Et
            </button>
            <button
              onClick={() =>
                regen.mutate(b.batchId, {
                  onSuccess: (res) => {
                    downloadBase64File(res.credentialsFileBase64, res.credentialsFilename);
                    onRegenerated?.(res.credentialsFilename);
                  },
                })
              }
              disabled={regen.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
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
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              İptal Et
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
