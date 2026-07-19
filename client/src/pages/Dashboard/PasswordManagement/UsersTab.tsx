import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../../utils/apiService';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import {
  DocumentTable,
  DocumentTableBody,
  DocumentTableCell,
  DocumentTableHead,
  DocumentTableHeader,
  DocumentTableRow,
} from '../../../components/ui/DocumentTable';
import PasswordRevealModal from './PasswordRevealModal';
import ResetReasonModal from './ResetReasonModal';
import { useResetPassword, useGeneratePassword } from './hooks/useUserPasswordActions';

interface UserRow {
  id: string;
  adSoyad: string;
  rol: string;
  sinif?: string;
  sube?: string;
  passwordLastSetAt?: string;
}

export default function UsersTab() {
  const { data: users = [] } = useQuery<UserRow[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await UserService.getUsers();
      return (data ?? []) as UserRow[];
    },
  });

  const [rolFilter, setRolFilter] = useState<string>('');
  const [hasPassword, setHasPassword] = useState<'all' | 'yes' | 'no'>('all');
  const [search, setSearch] = useState('');

  const [pendingUser, setPendingUser] = useState<UserRow | null>(null);
  const [pendingMode, setPendingMode] = useState<'reset' | 'generate' | null>(null);
  const [revealed, setRevealed] = useState<{ password: string; label: string } | null>(null);

  const resetMut = useResetPassword();
  const genMut = useGeneratePassword();

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (rolFilter && u.rol !== rolFilter) return false;
        if (hasPassword === 'yes' && !u.passwordLastSetAt) return false;
        if (hasPassword === 'no' && u.passwordLastSetAt) return false;
        if (
          search &&
          !u.adSoyad.toLowerCase().includes(search.toLowerCase()) &&
          !u.id.includes(search)
        )
          return false;
        return true;
      }),
    [users, rolFilter, hasPassword, search],
  );

  const handleConfirm = async (reason: string, reasonNote?: string) => {
    if (!pendingUser || !pendingMode) return;
    const mut = pendingMode === 'reset' ? resetMut : genMut;
    mut.mutate(
      { userId: pendingUser.id, reason, ...(reasonNote !== undefined && { reasonNote }) },
      {
        onSuccess: (res) => {
          setRevealed({
            password: res.password,
            label: `${pendingUser.adSoyad} (${pendingUser.id})`,
          });
          setPendingUser(null);
          setPendingMode(null);
        },
        onError: (err: unknown) => {
          alert(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen'}`);
          setPendingUser(null);
          setPendingMode(null);
        },
      },
    );
  };

  const inputCls =
    'h-8 px-3 rounded-[var(--radius-sm)] text-xs font-mono border border-[var(--rule)] bg-[var(--paper)] dark:bg-[var(--surface-2)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-tint)]';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <input
          placeholder="İsim veya ID ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls}
        />
        <select
          value={rolFilter}
          onChange={(e) => setRolFilter(e.target.value)}
          className={inputCls}
        >
          <option value="">Tüm roller</option>
          <option value="student">Öğrenci</option>
          <option value="teacher">Öğretmen</option>
          <option value="parent">Veli</option>
          <option value="admin">Yönetici</option>
        </select>
        <select
          value={hasPassword}
          onChange={(e) => setHasPassword(e.target.value as typeof hasPassword)}
          className={inputCls}
        >
          <option value="all">Şifre durumu: hepsi</option>
          <option value="yes">Şifresi var</option>
          <option value="no">Şifresi yok</option>
        </select>
        <span className="text-xs font-medium text-[var(--ink-dim)]">{filtered.length} kayıt</span>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--rule)] overflow-hidden">
        <DocumentTable>
          <DocumentTableHeader>
            <DocumentTableRow>
              <DocumentTableHead>ID</DocumentTableHead>
              <DocumentTableHead>Ad Soyad</DocumentTableHead>
              <DocumentTableHead>Rol</DocumentTableHead>
              <DocumentTableHead>Sınıf</DocumentTableHead>
              <DocumentTableHead>Şifre Durumu</DocumentTableHead>
              <DocumentTableHead>İşlem</DocumentTableHead>
            </DocumentTableRow>
          </DocumentTableHeader>
          <DocumentTableBody>
            {filtered.slice(0, 500).map((u) => (
              <DocumentTableRow key={u.id}>
                <DocumentTableCell className="font-mono text-xs">{u.id}</DocumentTableCell>
                <DocumentTableCell className="font-serif text-[var(--ink)]">
                  {u.adSoyad}
                </DocumentTableCell>
                <DocumentTableCell>
                  <Chip tone="default">{u.rol}</Chip>
                </DocumentTableCell>
                <DocumentTableCell className="font-mono text-xs">
                  {u.sinif ? `${u.sinif}${u.sube ?? ''}` : '—'}
                </DocumentTableCell>
                <DocumentTableCell>
                  {u.passwordLastSetAt ? (
                    <Chip tone="ok">
                      ✓ {new Date(u.passwordLastSetAt).toLocaleDateString('tr-TR')}
                    </Chip>
                  ) : (
                    <Chip tone="warn">Yok</Chip>
                  )}
                </DocumentTableCell>
                <DocumentTableCell>
                  {u.passwordLastSetAt ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setPendingUser(u);
                        setPendingMode('reset');
                      }}
                    >
                      Şifre Sıfırla
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setPendingUser(u);
                        setPendingMode('generate');
                      }}
                    >
                      Yeni Şifre Üret
                    </Button>
                  )}
                </DocumentTableCell>
              </DocumentTableRow>
            ))}
          </DocumentTableBody>
        </DocumentTable>
      </div>
      {filtered.length > 500 && (
        <p className="font-mono text-xs text-[var(--ink-dim)]">
          İlk 500 kayıt gösteriliyor — filtreleri daraltın.
        </p>
      )}

      {pendingUser && pendingMode && (
        <ResetReasonModal
          userLabel={`${pendingUser.adSoyad} (${pendingUser.id})`}
          onConfirm={handleConfirm}
          onCancel={() => {
            setPendingUser(null);
            setPendingMode(null);
          }}
        />
      )}
      {revealed && (
        <PasswordRevealModal
          password={revealed.password}
          userLabel={revealed.label}
          onClose={() => setRevealed(null)}
        />
      )}
    </div>
  );
}
