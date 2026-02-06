import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
import { Home, User, Settings } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p>Tab 1 içeriği burada görünecek.</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p>Tab 2 içeriği burada görünecek.</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p>Tab 3 içeriği burada görünecek.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="home">
      <TabsList>
        <TabsTrigger value="home" icon={<Home size={18} />}>
          Ana Sayfa
        </TabsTrigger>
        <TabsTrigger value="profile" icon={<User size={18} />}>
          Profil
        </TabsTrigger>
        <TabsTrigger value="settings" icon={<Settings size={18} />}>
          Ayarlar
        </TabsTrigger>
      </TabsList>
      <TabsContent value="home">
        <p>Ana sayfa içeriği</p>
      </TabsContent>
      <TabsContent value="profile">
        <p>Profil içeriği</p>
      </TabsContent>
      <TabsContent value="settings">
        <p>Ayarlar içeriği</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithBadges: Story = {
  render: () => (
    <Tabs defaultValue="inbox">
      <TabsList>
        <TabsTrigger value="inbox" badge={5}>
          Gelen Kutusu
        </TabsTrigger>
        <TabsTrigger value="sent" badge={12}>
          Gönderilenler
        </TabsTrigger>
        <TabsTrigger value="drafts">
          Taslaklar
        </TabsTrigger>
      </TabsList>
      <TabsContent value="inbox">
        <p>5 yeni mesaj</p>
      </TabsContent>
      <TabsContent value="sent">
        <p>12 gönderilmiş mesaj</p>
      </TabsContent>
      <TabsContent value="drafts">
        <p>Taslak mesajlar</p>
      </TabsContent>
    </Tabs>
  ),
};

export const PillsVariant: Story = {
  render: () => (
    <Tabs defaultValue="tab1">
      <TabsList variant="pills">
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p>Pills variant içerik 1</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p>Pills variant içerik 2</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p>Pills variant içerik 3</p>
      </TabsContent>
    </Tabs>
  ),
};

export const UnderlineVariant: Story = {
  render: () => (
    <Tabs defaultValue="tab1">
      <TabsList variant="underline">
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p>Underline variant içerik 1</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p>Underline variant içerik 2</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p>Underline variant içerik 3</p>
      </TabsContent>
    </Tabs>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <Tabs defaultValue="tab1">
      <TabsList fullWidth>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p>Full width tab içerik 1</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p>Full width tab içerik 2</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p>Full width tab içerik 3</p>
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="tab1" orientation="vertical">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p>Vertical tab içerik 1</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p>Vertical tab içerik 2</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p>Vertical tab içerik 3</p>
      </TabsContent>
    </Tabs>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2" disabled>
          Tab 2 (Disabled)
        </TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p>Tab 1 içeriği</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p>Bu tab disabled</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p>Tab 3 içeriği</p>
      </TabsContent>
    </Tabs>
  ),
};

