import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Devlet/Chip',
  component: Chip,
  tags: ['autodocs'],
  args: { children: 'Aktif' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['default', 'state', 'black', 'outline'] },
  },
};
export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = { args: { tone: 'default' } };
export const State: Story = { args: { tone: 'state', children: 'Onay bekliyor' } };
export const Black: Story = { args: { tone: 'black', children: 'Resmi' } };
export const Outline: Story = { args: { tone: 'outline', children: 'Taslak' } };

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip tone="default">Default</Chip>
      <Chip tone="state">State</Chip>
      <Chip tone="black">Black</Chip>
      <Chip tone="outline">Outline</Chip>
    </div>
  ),
};
