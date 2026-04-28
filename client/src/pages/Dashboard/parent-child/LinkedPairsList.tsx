import { Link2, ArrowRight, Unlink, Search } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
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
    <Card>
      <div className="border-b border-[var(--rule)] p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          <Link2 size={12} />
          Mevcut Bağlantılar
          <span className="font-serif text-[var(--ink-2)] text-xs">{linkedPairs.length}</span>
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search
            size={12}
            className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
          />
          <Input
            placeholder="Bağlantılarda ara…"
            value={linksSearchRaw}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Bağlantılarda ara"
            className="pl-5 h-8 text-sm"
          />
        </div>
      </div>

      {filteredLinks.length === 0 ? (
        <div className="px-6 py-12 flex flex-col items-center gap-2 text-[var(--ink-dim)]">
          <Link2 size={28} />
          <p className="font-serif text-sm">
            {linkedPairs.length === 0 ? 'Henüz bağlantı yok' : 'Arama sonucu bulunamadı'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-[var(--rule)]">
          {filteredLinks.map((pair) => (
            <div
              key={`${pair.parentId}-${pair.childId}`}
              className="flex items-center gap-3 bg-[var(--paper)] px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-serif text-sm text-[var(--ink)] truncate">
                  {pair.parentName}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <ArrowRight size={10} className="text-[var(--ink-dim)] shrink-0" />
                  <span className="font-mono text-[11px] text-[var(--ink-2)] truncate">
                    {pair.childName}
                    {pair.childSinif && ` · ${pair.childSinif}/${pair.childSube}`}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
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
                className="text-[var(--ink-dim)] hover:text-[var(--state)]"
              >
                <Unlink size={12} />
                Kaldır
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
