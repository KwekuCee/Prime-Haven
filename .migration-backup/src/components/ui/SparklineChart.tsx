import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
}

const SparklineChart = ({ data, color = 'hsl(var(--primary))', height = 40 }: SparklineChartProps) => {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`sparkGrad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              fontSize: 10,
              background: 'rgba(15, 15, 20, 0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '4px 8px',
            }}
            formatter={(val: number) => [val.toLocaleString(), '']}
            labelFormatter={() => ''}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#sparkGrad-${color.replace(/[^a-z0-9]/gi, '')})`}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
