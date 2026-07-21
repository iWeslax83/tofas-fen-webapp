import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';
import { Button } from './Button';

const meta: Meta = {
  title: 'Components/ConfirmDialog',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj;

const Trigger = ({ variant }: { variant?: 'default' | 'danger' }) => {
  const confirm = useConfirm();
  const [result, setResult] = useState<string>('');

  return (
    <>
      <Button
        variant={variant === 'danger' ? 'danger' : 'primary'}
        onClick={async () => {
          const ok = await confirm({
            title: variant === 'danger' ? 'Kaydı sil' : 'Değişiklikleri kaydet',
            description:
              variant === 'danger'
                ? 'Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
                : 'Yaptığınız değişiklikleri kaydetmek istiyor musunuz?',
            confirmLabel: variant === 'danger' ? 'Sil' : 'Kaydet',
            variant,
          });
          setResult(ok ? 'Onaylandı' : 'Vazgeçildi');
        }}
      >
        {variant === 'danger' ? 'Sil' : 'Onay iste'}
      </Button>
      {result && <p style={{ marginTop: 12, fontFamily: 'sans-serif' }}>{result}</p>}
    </>
  );
};

export const Default: Story = {
  render: () => (
    <ConfirmProvider>
      <Trigger />
    </ConfirmProvider>
  ),
};

export const Danger: Story = {
  render: () => (
    <ConfirmProvider>
      <Trigger variant="danger" />
    </ConfirmProvider>
  ),
};
