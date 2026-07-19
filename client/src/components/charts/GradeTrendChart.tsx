import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { NoteEntry } from '../../pages/Dashboard/NotlarPage';

import './GradeTrendChart.css';

const LINE_COLORS = [
  'var(--accent)',
  'var(--info)',
  'var(--ok)',
  'var(--warn)',
  '#7c5cbf',
  '#0891b2',
  '#c2410c',
];

interface GradeTrendChartProps {
  notes: NoteEntry[];
}

export default function GradeTrendChart({ notes }: GradeTrendChartProps) {
  const { chartData, subjects, hasEnoughData } = useMemo(() => {
    // Group notes by semester and lesson (subject)
    const grouped = new Map<string, Map<string, number[]>>();
    const subjectSet = new Set<string>();

    for (const note of notes) {
      const semester = note.semester || 'Belirtilmemiş';
      subjectSet.add(note.lesson);

      if (!grouped.has(semester)) {
        grouped.set(semester, new Map());
      }
      const semesterMap = grouped.get(semester)!;
      if (!semesterMap.has(note.lesson)) {
        semesterMap.set(note.lesson, []);
      }
      semesterMap.get(note.lesson)!.push(note.average);
    }

    const subjects = Array.from(subjectSet).sort();
    const semesters = Array.from(grouped.keys()).sort();

    const chartData = semesters.map((semester) => {
      const entry: Record<string, string | number> = { semester };
      const semesterMap = grouped.get(semester)!;

      for (const subject of subjects) {
        const averages = semesterMap.get(subject);
        if (averages && averages.length > 0) {
          entry[subject] =
            Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10;
        }
      }

      return entry;
    });

    return {
      chartData,
      subjects,
      hasEnoughData: semesters.length >= 2,
    };
  }, [notes]);

  if (!hasEnoughData) {
    return null;
  }

  return (
    <div className="grade-trend-chart">
      <div className="grade-trend-chart-header">
        <TrendingUp size={20} />
        <h3>Not Trendi</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
          <XAxis dataKey="donem" tick={{ fontSize: 12, fill: 'var(--ink-dim)' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--ink-dim)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
            }}
            labelStyle={{ color: 'var(--ink)' }}
          />
          <Legend wrapperStyle={{ color: 'var(--ink-2)', fontSize: 12 }} />
          {subjects.map((subject, i) => (
            <Line
              key={subject}
              type="monotone"
              dataKey={subject}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
