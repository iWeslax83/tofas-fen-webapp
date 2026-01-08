import type { Meta, StoryObj } from '@storybook/react';
import { Grid, GridItem } from './Grid';

const meta: Meta<typeof Grid> = {
  title: 'Components/Grid',
  component: Grid,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Grid>;

const Box = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`p-4 bg-primary-red-lighter border border-primary-red rounded-lg text-center ${className}`}
  >
    {children}
  </div>
);

export const Basic: Story = {
  render: () => (
    <Grid cols={12} gap={4}>
      <GridItem colSpan={12}>
        <Box>Full Width (12 columns)</Box>
      </GridItem>
      <GridItem colSpan={6}>
        <Box>Half Width (6 columns)</Box>
      </GridItem>
      <GridItem colSpan={6}>
        <Box>Half Width (6 columns)</Box>
      </GridItem>
      <GridItem colSpan={4}>
        <Box>One Third (4 columns)</Box>
      </GridItem>
      <GridItem colSpan={4}>
        <Box>One Third (4 columns)</Box>
      </GridItem>
      <GridItem colSpan={4}>
        <Box>One Third (4 columns)</Box>
      </GridItem>
    </Grid>
  ),
};

export const Responsive: Story = {
  render: () => (
    <Grid cols={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={4}>
      <GridItem colSpan={{ sm: 1, md: 1, lg: 1, xl: 1 }}>
        <Box>Item 1</Box>
      </GridItem>
      <GridItem colSpan={{ sm: 1, md: 1, lg: 1, xl: 1 }}>
        <Box>Item 2</Box>
      </GridItem>
      <GridItem colSpan={{ sm: 1, md: 1, lg: 1, xl: 1 }}>
        <Box>Item 3</Box>
      </GridItem>
      <GridItem colSpan={{ sm: 1, md: 1, lg: 1, xl: 1 }}>
        <Box>Item 4</Box>
      </GridItem>
    </Grid>
  ),
};

export const MixedSpans: Story = {
  render: () => (
    <Grid cols={12} gap={4}>
      <GridItem colSpan={8}>
        <Box>8 columns</Box>
      </GridItem>
      <GridItem colSpan={4}>
        <Box>4 columns</Box>
      </GridItem>
      <GridItem colSpan={4}>
        <Box>4 columns</Box>
      </GridItem>
      <GridItem colSpan={4}>
        <Box>4 columns</Box>
      </GridItem>
      <GridItem colSpan={4}>
        <Box>4 columns</Box>
      </GridItem>
    </Grid>
  ),
};

export const AutoFit: Story = {
  render: () => (
    <Grid cols={12} gap={4} className="grid-auto-fit">
      {Array.from({ length: 8 }, (_, i) => (
        <GridItem key={i}>
          <Box>Auto Item {i + 1}</Box>
        </GridItem>
      ))}
    </Grid>
  ),
};

export const WithRowSpan: Story = {
  render: () => (
    <Grid cols={4} gap={4}>
      <GridItem colSpan={1} rowSpan={2}>
        <Box>Row Span 2</Box>
      </GridItem>
      <GridItem colSpan={3}>
        <Box>Item 1</Box>
      </GridItem>
      <GridItem colSpan={3}>
        <Box>Item 2</Box>
      </GridItem>
      <GridItem colSpan={4}>
        <Box>Full Width</Box>
      </GridItem>
    </Grid>
  ),
};

export const DifferentGaps: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h3>Gap 2</h3>
        <Grid cols={3} gap={2}>
          {Array.from({ length: 3 }, (_, i) => (
            <GridItem key={i}>
              <Box>Item {i + 1}</Box>
            </GridItem>
          ))}
        </Grid>
      </div>
      <div>
        <h3>Gap 4</h3>
        <Grid cols={3} gap={4}>
          {Array.from({ length: 3 }, (_, i) => (
            <GridItem key={i}>
              <Box>Item {i + 1}</Box>
            </GridItem>
          ))}
        </Grid>
      </div>
      <div>
        <h3>Gap 6</h3>
        <Grid cols={3} gap={6}>
          {Array.from({ length: 3 }, (_, i) => (
            <GridItem key={i}>
              <Box>Item {i + 1}</Box>
            </GridItem>
          ))}
        </Grid>
      </div>
    </div>
  ),
};

