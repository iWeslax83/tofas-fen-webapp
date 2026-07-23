import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';

interface LegalPageLayoutProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export const LegalPageLayout = ({ title, updatedAt, children }: LegalPageLayoutProps) => (
  <div className="min-h-screen bg-[var(--paper)] flex flex-col">
    <div className="h-1.5 bg-[var(--accent)]" aria-hidden="true" />

    <div className="flex-1 flex justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-3xl space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-dim)] hover:text-[var(--accent)] transition-colors"
        >
          <ArrowLeft size={14} />
          Giriş sayfasına dön
        </Link>

        <Card className="overflow-hidden" contentClassName="p-0">
          <div className="bg-[var(--accent)] text-white px-6 py-4">
            <h1 className="font-serif text-xl">{title}</h1>
            <p className="text-xs text-white/70 mt-1">Son güncelleme: {updatedAt}</p>
          </div>

          <div
            className={[
              'p-6 sm:p-8 font-serif text-sm leading-relaxed text-[var(--ink-2)]',
              'space-y-5',
              '[&_h2]:font-sans [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--ink)] [&_h2]:pt-2',
              '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1',
              '[&_strong]:text-[var(--ink)]',
              '[&_a]:text-[var(--accent)] [&_a]:underline',
            ].join(' ')}
          >
            {children}
          </div>
        </Card>
      </div>
    </div>

    <footer className="w-full bg-black/70 py-4">
      <p className="text-center text-xs text-white/90">
        © {new Date().getFullYear()} Tofaş Fen Lisesi Bilgilendirme Sistemi. Tüm hakları saklıdır.
      </p>
    </footer>
  </div>
);
