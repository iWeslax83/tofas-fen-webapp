import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../../utils/apiService';
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
      { userId: pendingUser.id, reason, reasonNote },
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <input
          placeholder="İsim veya ID ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-[var(--rule)] rounded bg-[var(--paper)] text-[var(--ink)]"
        />
        <select
          value={rolFilter}
          onChange={(e) => setRolFilter(e.target.value)}
          className="px-3 py-1.5 border border-[var(--rule)] rounded bg-[var(--paper)] text-[var(--ink)]"
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
          className="px-3 py-1.5 border border-[var(--rule)] rounded bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="all">Şifre durumu: hepsi</option>
          <option value="yes">Şifresi var</option>
          <option value="no">Şifresi yok</option>
        </select>
        <span className="text-sm text-[var(--ink-dim)]">{filtered.length} kayıt</span>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--surface)]">
          <tr>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              ID
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Ad Soyad
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Rol
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Sınıf
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Şifre Durumu
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              İşlem
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 500).map((u) => (
            <tr key={u.id} className="border-b border-[var(--rule)] hover:bg-[var(--surface)]">
              <td className="px-3 py-2 font-mono text-xs text-[var(--ink)]">{u.id}</td>
              <td className="px-3 py-2 text-[var(--ink)]">{u.adSoyad}</td>
              <td className="px-3 py-2 text-[var(--ink)]">{u.rol}</td>
              <td className="px-3 py-2 text-[var(--ink)]">
                {u.sinif ? `${u.sinif}${u.sube ?? ''}` : '-'}
              </td>
              <td className="px-3 py-2">
                {u.passwordLastSetAt ? (
                  <span className="text-[var(--ok)]">
                    ✓ {new Date(u.passwordLastSetAt).toLocaleDateString('tr-TR')}
                  </span>
                ) : (
                  <span className="text-[var(--warn)]">Yok</span>
                )}
              </td>
              <td className="px-3 py-2">
                {u.passwordLastSetAt ? (
                  <button
                    onClick={() => {
                      setPendingUser(u);
                      setPendingMode('reset');
                    }}
                    className="px-2 py-1 bg-[var(--state)] text-white rounded text-xs hover:bg-[var(--state-deep)]"
                  >
                    Şifre Sıfırla
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPendingUser(u);
                      setPendingMode('generate');
                    }}
                    className="px-2 py-1 bg-[var(--state)] text-white rounded text-xs hover:bg-[var(--state-deep)]"
                  >
                    Yeni Şifre Üret
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 500 && (
        <p className="text-xs text-[var(--ink-dim)]">
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
