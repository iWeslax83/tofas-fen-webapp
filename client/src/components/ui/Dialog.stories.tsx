import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from './Dialog';
import { Button } from './Button';

const meta: Meta<typeof Dialog> = {
  title: 'Components/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

const DialogExample = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen' }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Dialog Aç</Button>
      <Dialog open={open} onOpenChange={setOpen} size={size}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Başlığı</DialogTitle>
            <DialogDescription>
              Bu bir dialog açıklamasıdır. Kullanıcıya bilgi vermek için kullanılır.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p>
              Dialog içeriği burada görünecek. Bu alan scrollable olabilir ve uzun içerikler
              için kullanılabilir.
            </p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button onClick={() => setOpen(false)}>Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const Default: Story = {
  render: () => <DialogExample />,
};

export const Small: Story = {
  render: () => <DialogExample size="sm" />,
};

export const Medium: Story = {
  render: () => <DialogExample size="md" />,
};

export const Large: Story = {
  render: () => <DialogExample size="lg" />,
};

export const ExtraLarge: Story = {
  render: () => <DialogExample size="xl" />,
};

export const Fullscreen: Story = {
  render: () => <DialogExample size="fullscreen" />,
};

export const WithoutCloseButton: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Dialog Aç</Button>
        <Dialog open={open} onOpenChange={setOpen} showCloseButton={false}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kapat Butonu Yok</DialogTitle>
              <DialogDescription>
                Bu dialog'da kapat butonu yok. Sadece overlay'e tıklayarak veya ESC tuşu ile kapatabilirsiniz.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <p>Dialog içeriği</p>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Kapat</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
};

export const ScrollableContent: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Uzun İçerikli Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uzun İçerik</DialogTitle>
              <DialogDescription>
                Bu dialog scrollable içerik içerir.
              </DialogDescription>
            </DialogHeader>
            <DialogBody scrollable>
              {Array.from({ length: 50 }, (_, i) => (
                <p key={i}>
                  Paragraf {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
              ))}
            </DialogBody>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button onClick={() => setOpen(false)}>Onayla</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
};

