import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GradeTrendChart from '../GradeTrendChart';
import type { NoteEntry } from '../../../pages/Dashboard/NotlarPage';

// Mock recharts to avoid canvas rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: any) => <div data-testid="line-chart" data-points={data?.length}>{children}</div>,
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const makeNote = (overrides: Partial<NoteEntry> = {}): NoteEntry => ({
  id: '1',
  studentName: 'Test Öğrenci',
  lesson: 'Matematik',
  exam1: 80,
  exam2: 85,
  oral: 90,
  average: 85,
  semester: '2024-1',
  ...overrides,
});

describe('GradeTrendChart', () => {
  it('renders chart when multiple periods exist', () => {
    const notes = [
      makeNote({ id: '1', lesson: 'Matematik', semester: '2024-1', average: 80 }),
      makeNote({ id: '2', lesson: 'Matematik', semester: '2024-2', average: 90 }),
    ];
    render(<GradeTrendChart notes={notes} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByText('Not Trendi')).toBeInTheDocument();
  });

  it('renders nothing when only one period exists', () => {
    const notes = [
      makeNote({ id: '1', lesson: 'Matematik', semester: '2024-1', average: 80 }),
      makeNote({ id: '2', lesson: 'Fizik', semester: '2024-1', average: 75 }),
    ];
    const { container } = render(<GradeTrendChart notes={notes} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing with empty notes', () => {
    const { container } = render(<GradeTrendChart notes={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('creates one line per subject', () => {
    const notes = [
      makeNote({ id: '1', lesson: 'Matematik', semester: '2024-1', average: 80 }),
      makeNote({ id: '2', lesson: 'Fizik', semester: '2024-1', average: 70 }),
      makeNote({ id: '3', lesson: 'Matematik', semester: '2024-2', average: 85 }),
      makeNote({ id: '4', lesson: 'Fizik', semester: '2024-2', average: 75 }),
    ];
    render(<GradeTrendChart notes={notes} />);
    expect(screen.getByTestId('line-Fizik')).toBeInTheDocument();
    expect(screen.getByTestId('line-Matematik')).toBeInTheDocument();
  });

  it('handles notes without semester by grouping as Belirtilmemiş', () => {
    const notes = [
      makeNote({ id: '1', lesson: 'Matematik', semester: undefined, average: 80 }),
      makeNote({ id: '2', lesson: 'Matematik', semester: '2024-1', average: 90 }),
    ];
    render(<GradeTrendChart notes={notes} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
