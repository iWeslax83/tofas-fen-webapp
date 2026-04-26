import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Devlet/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'Adınızı yazın' },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: 'Ayşe Kaya' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Düzenlenemez' } };

export const Labeled: Story = {
  render: (args) => (
    <label className="flex flex-col gap-1 max-w-sm">
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink-dim)]">
        TC kimlik no
      </span>
      <Input {...args} />
    </label>
  ),
  args: { placeholder: '11 hane' },
};
