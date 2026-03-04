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

const LINE_COLORS = ['#0f766e', '#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#db2777', '#0891b2'];

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
          entry[subject] = Math.round(
            (averages.reduce((a, b) => a + b, 0) / averages.length) * 10
          ) / 10;
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
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
