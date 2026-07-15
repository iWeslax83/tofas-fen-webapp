import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserRole } from '../../@types';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const HOME_BY_ROLE: Record<string, string> = {
  admin: '/admin',
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
};

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const home = HOME_BY_ROLE[(user?.rol as UserRole) ?? ''] ?? '/';
  const breadcrumb = [{ label: 'Ana Sayfa', path: home }, { label: 'Sayfa Bulunamadı' }];

  return (
    <ModernDashboardLayout pageTitle="Sayfa Bulunamadı" breadcrumb={breadcrumb}>
      <div className="p-6 max-w-xl">
        <Card contentClassName="p-8 border-l-4 border-[var(--state)]">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Hata 404
          </p>
          <h1 className="mt-2 font-serif text-2xl text-[var(--ink)]">Sayfa bulunamadı</h1>
          <p className="mt-3 font-serif text-sm leading-relaxed text-[var(--ink-2)]">
            Aradığınız sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir. Adresi kontrol edin
            veya panele dönün.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <Button onClick={() => navigate(home)}>
              <ArrowLeft size={16} />
              Panele dön
            </Button>
            <Link
              to="/"
              className="text-sm text-[var(--ink-dim)] underline underline-offset-4 hover:text-[var(--state)] transition-colors"
            >
              Giriş sayfası
            </Link>
          </div>
        </Card>
      </div>
    </ModernDashboardLayout>
  );
}
