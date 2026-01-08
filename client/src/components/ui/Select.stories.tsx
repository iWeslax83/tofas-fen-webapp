import type { Meta, StoryObj } from '@storybook/react';
import { Select, SelectOption } from './Select';
import { User, Mail, Settings, Home } from 'lucide-react';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

const basicOptions: SelectOption[] = [
  { value: '1', label: 'Seçenek 1' },
  { value: '2', label: 'Seçenek 2' },
  { value: '3', label: 'Seçenek 3' },
  { value: '4', label: 'Seçenek 4' },
];

const iconOptions: SelectOption[] = [
  { value: 'home', label: 'Ana Sayfa', icon: <Home size={16} /> },
  { value: 'profile', label: 'Profil', icon: <User size={16} /> },
  { value: 'mail', label: 'E-posta', icon: <Mail size={16} /> },
  { value: 'settings', label: 'Ayarlar', icon: <Settings size={16} /> },
];

const groupedOptions: SelectOption[] = [
  { value: '1', label: 'Seçenek 1', group: 'Grup 1' },
  { value: '2', label: 'Seçenek 2', group: 'Grup 1' },
  { value: '3', label: 'Seçenek 3', group: 'Grup 2' },
  { value: '4', label: 'Seçenek 4', group: 'Grup 2' },
  { value: '5', label: 'Seçenek 5' },
];

const manyOptions: SelectOption[] = Array.from({ length: 50 }, (_, i) => ({
  value: String(i + 1),
  label: `Seçenek ${i + 1}`,
}));

export const Default: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select options={basicOptions} placeholder="Bir seçenek seçin" />
    </div>
  ),
};

export const WithValue: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select
        options={basicOptions}
        defaultValue="2"
        placeholder="Bir seçenek seçin"
      />
    </div>
  ),
};

export const Searchable: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select
        options={manyOptions}
        placeholder="Ara ve seç..."
        searchable
      />
    </div>
  ),
};

export const Clearable: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select
        options={basicOptions}
        defaultValue="2"
        placeholder="Bir seçenek seçin"
        clearable
      />
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select
        options={iconOptions}
        placeholder="Bir seçenek seçin"
      />
    </div>
  ),
};

export const Grouped: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select
        options={groupedOptions}
        placeholder="Bir seçenek seçin"
      />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <Select options={basicOptions} size="sm" placeholder="Small" />
      <Select options={basicOptions} size="md" placeholder="Medium" />
      <Select options={basicOptions} size="lg" placeholder="Large" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select
        options={basicOptions}
        defaultValue="2"
        placeholder="Bir seçenek seçin"
        disabled
      />
    </div>
  ),
};

export const WithDisabledOptions: Story = {
  render: () => {
    const optionsWithDisabled: SelectOption[] = [
      { value: '1', label: 'Seçenek 1' },
      { value: '2', label: 'Seçenek 2', disabled: true },
      { value: '3', label: 'Seçenek 3' },
      { value: '4', label: 'Seçenek 4', disabled: true },
    ];
    return (
      <div style={{ width: '300px' }}>
        <Select
          options={optionsWithDisabled}
          placeholder="Bir seçenek seçin"
        />
      </div>
    );
  },
};

export const Error: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select
        options={basicOptions}
        placeholder="Bir seçenek seçin"
        error
      />
    </div>
  ),
};

export const SearchableAndGrouped: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select
        options={groupedOptions}
        placeholder="Ara ve seç..."
        searchable
      />
    </div>
  ),
};

