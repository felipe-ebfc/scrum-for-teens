import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingDown, Flame, Zap, Target } from 'lucide-react';
import { Task } from '@/types/Task';
import { useVelocityData, VelocityDataPoint } from '@/hooks/useVelocityData';

interface SprintVelocityChartProps {
  tasks: Task[];
  sprintStartDate?: string;
  sprintDurationDays?: number;
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */
const VelocityTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const ideal = payload.find((p) => p.dataKey === 'ideal');
  const actual = payload.find((p) => p.dataKey === 'actual');

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {ideal && (
        <p className="text-blue-500">
          Ideal remaining: <span className="font-medium">{ideal.value}</span>
        </p>
      )}
      {actual && actual.value !== null && (
        <p className="text-purple-600">
          Actual remaining: <span className="font-medium">{actual.value}</span>
        </p>
      )}
      {actual && ideal && actual.value !== null && (
        <p
          className={`mt-1 font-medium ${
            actual.value <= ideal.value ? 'text-green-600' : 'text-orange-500'
          }`}
        >
          {actual.value <= ideal.value
            ? `🔥 ${Math.round(ideal.value - actual.value)} ahead`
            : `📈 ${Math.round(actual.value - ideal.value)} behind`}
        </p>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Pacing badge                                                       */
/* ------------------------------------------------------------------ */
const PacingBadge: React.FC<{ pacing: 'ahead' | 'on-track' | 'behind' }> = ({
  pacing,
}) => {
  const config = {
    ahead: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: '🏃 Ahead of pace!',
    },
    'on-track': {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      label: '✅ On track',
    },
    behind: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      label: '⏰ Behind — you got this!',
    },
  }[pacing];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
const SprintVelocityChart: React.FC<SprintVelocityChartProps> = ({
  tasks,
  sprintStartDate,
  sprintDurationDays = 7,
}) => {
  const { data, stats } = useVelocityData(
    tasks,
    sprintStartDate,
    sprintDurationDays,
  );

  // No data state
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TrendingDown className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Sprint Burndown</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No sprint tasks yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Move tasks from Backlog to Todo to start your sprint!
          </p>
        </div>
      </div>
    );
  }

  // Determine Y-axis max (highest value across ideal & actual)
  const yMax = useMemo(() => {
    let max = 0;
    for (const d of data) {
      if (d.ideal > max) max = d.ideal;
      if (d.actual !== null && d.actual > max) max = d.actual;
    }
    return Math.ceil(max) + 1;
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TrendingDown className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Sprint Burndown</h2>
        </div>
        <PacingBadge pacing={stats.pacing} />
      </div>

      {/* Chart */}
      <div className="w-full h-52 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradIdeal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<VelocityTooltip />} />
            {/* Ideal line — dashed, blue */}
            <Area
              type="monotone"
              dataKey="ideal"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#gradIdeal)"
              name="Ideal"
              dot={false}
            />
            {/* Actual line — solid, purple */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fill="url(#gradActual)"
              name="Actual"
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
              connectNulls={false}
              activeDot={{ r: 6, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="line"
              wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        {/* Streak */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Flame
              className={`w-4 h-4 ${
                stats.streak > 0 ? 'text-orange-500' : 'text-gray-300'
              }`}
            />
            <span className="text-xl font-bold text-gray-800">
              {stats.streak}
            </span>
          </div>
          <p className="text-xs text-gray-500">Day Streak</p>
        </div>

        {/* Avg per day */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-xl font-bold text-gray-800">
              {stats.avgPerDay}
            </span>
          </div>
          <p className="text-xs text-gray-500">Avg / Day</p>
        </div>

        {/* Best day */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-xl font-bold text-gray-800">
              {stats.bestDay}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Best Day{stats.bestDay > 0 ? ` (${stats.bestDayLabel})` : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SprintVelocityChart;
