import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Kline, Trade } from '../types';
import { calculateSMA } from '../utils/backtestUtils';
import { format } from 'date-fns';

interface ChartProps {
  klines: Kline[];
  trades: Trade[];
  shortPeriod: number;
  longPeriod: number;
}

interface ChartDataPoint {
  time: string;
  price: number;
  shortMA: number;
  longMA: number;
}

export const Chart: React.FC<ChartProps> = ({
  klines,
  shortPeriod,
  longPeriod,
}) => {
  const closes = klines.map(k => k.close);
  const shortMA = calculateSMA(closes, shortPeriod);
  const longMA = calculateSMA(closes, longPeriod);

  const chartData: ChartDataPoint[] = klines.map((kline, index) => ({
    time: format(new Date(kline.openTime), 'MM-dd HH:mm'),
    price: kline.close,
    shortMA: shortMA[index],
    longMA: longMA[index],
  }));

  const formatTooltipValue = (value: number, name: string) => [value.toFixed(4), name];
  const formatTooltipLabel = (label: string) => `Time: ${label}`;

  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-gray-50 to-white rounded-lg">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" opacity={0.7} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(value: string) => value}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['dataMin - 0.01', 'dataMax + 0.01']}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(value: number) => `$${value.toFixed(2)}`}
            width={80}
          />
          <Tooltip
            formatter={formatTooltipValue}
            labelFormatter={formatTooltipLabel}
            contentStyle={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Price"
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
          <Line
            type="monotone"
            dataKey="shortMA"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name={`MA ${shortPeriod}`}
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="longMA"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name={`MA ${longPeriod}`}
            strokeDasharray="10 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 