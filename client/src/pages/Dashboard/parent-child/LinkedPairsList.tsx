import { Link2, ArrowRight, Unlink } from 'lucide-react';
import type { LinkedPair, ConfirmAction } from './types';

interface LinkedPairsListProps {
  linkedPairs: LinkedPair[];
  filteredLinks: LinkedPair[];
  linksSearchRaw: string;
  processing: boolean;
  onSearchChange: (value: string) => void;
  onRequestUnlink: (action: ConfirmAction) => void;
}

export function LinkedPairsList({
  linkedPairs,
  filteredLinks,
  linksSearchRaw,
  processing,
  onSearchChange,
  onRequestUnlink,
}: LinkedPairsListProps) {
  return (
    <div className="ve-links-section" role="region" aria-label="Mevcut bağlantılar">
      <div className="ve-links-header">
        <div className="ve-links-title">
          <Link2 size={16} />
          Mevcut Bağlantılar ({linkedPairs.length})
        </div>
        <input
          className="ve-links-search"
          placeholder="Bağlantılarda ara..."
          value={linksSearchRaw}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Bağlantılarda ara"
        />
      </div>
      {filteredLinks.length === 0 ? (
        <div className="ve-empty">
          <Link2 size={32} />
          <p>{linkedPairs.length === 0 ? 'Henüz bağlantı yok' : 'Arama sonucu bulunamadı'}</p>
        </div>
      ) : (
        <div className="ve-links-grid">
          {filteredLinks.map((pair) => (
            <div key={`${pair.parentId}-${pair.childId}`} className="ve-link-card">
              <div className="ve-link-names">
                <div className="ve-link-parent">{pair.parentName}</div>
                <div className="ve-link-child">
                  {pair.childName}
                  {pair.childSinif && ` (${pair.childSinif}/${pair.childSube})`}
                </div>
              </div>
              <ArrowRight size={14} className="ve-link-arrow" />
              <button
                className="ve-unlink-btn"
                onClick={() =>
                  onRequestUnlink({
                    type: 'unlink',
                    parentId: pair.parentId,
                    childId: pair.childId,
                    parentName: pair.parentName,
                    childName: pair.childName,
                  })
                }
                disabled={processing}
                aria-label={`${pair.parentName} ve ${pair.childName} bağlantısını kaldır`}
                title="Bağlantıyı kaldır"
              >
                <Unlink size={12} />
                Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
