import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../../utils/apiService';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
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
    'h-8 px-3 text-xs font-mono border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--state)]';

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

      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--surface)]">
          <tr>
            {['ID', 'Ad Soyad', 'Rol', 'Sınıf', 'Şifre Durumu', 'İşlem'].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 border-b border-[var(--rule)] text-xs font-medium text-[var(--ink-dim)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 500).map((u) => (
            <tr key={u.id} className="border-b border-[var(--rule)] hover:bg-[var(--surface)]">
              <td className="px-3 py-2 font-mono text-xs text-[var(--ink-dim)]">{u.id}</td>
              <td className="px-3 py-2 font-serif text-[var(--ink)]">{u.adSoyad}</td>
              <td className="px-3 py-2">
                <Chip tone="default">{u.rol}</Chip>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-[var(--ink-dim)]">
                {u.sinif ? `${u.sinif}${u.sube ?? ''}` : '—'}
              </td>
              <td className="px-3 py-2">
                {u.passwordLastSetAt ? (
                  <Chip tone="black">
                    ✓ {new Date(u.passwordLastSetAt).toLocaleDateString('tr-TR')}
                  </Chip>
                ) : (
                  <Chip tone="state">Yok</Chip>
                )}
              </td>
              <td className="px-3 py-2">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
