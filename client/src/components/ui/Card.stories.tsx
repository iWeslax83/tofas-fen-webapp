import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Devlet/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'inline-radio', options: ['default', 'tinted'] },
    accentBar: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof Card>;

const Sample = (
  <div className="p-4">
    <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--ink-dim)] mb-2">
      Resmi Bildirim No. 2026/0042
    </div>
    <div className="font-serif text-lg text-[var(--ink)]">
      Sayın velimiz, dönem ortalamanız hesaplanmıştır.
    </div>
  </div>
);

export const Default: Story = { args: { tone: 'default', children: Sample } };
export const Tinted: Story = { args: { tone: 'tinted', children: Sample } };
export const WithAccentBar: Story = {
  args: { tone: 'default', accentBar: true, children: Sample },
};
