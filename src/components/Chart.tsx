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
    time: format(new Date(kline.openTime), 'yyyy-MM-dd HH:mm'),
    price: kline.close,
    shortMA: shortMA[index],
    longMA: longMA[index],
  }));

  const formatTooltipValue = (value: number, name: string) => [value.toFixed(4), name];
  const formatTooltipLabel = (label: string) => `Time: ${label}`;

  return (
    <div className="w-full h-[600px] p-4 bg-white rounded-lg shadow">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            tickFormatter={(value: string) => value.split(' ')[1]}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => value.toFixed(4)}
          />
          <Tooltip
            formatter={formatTooltipValue}
            labelFormatter={formatTooltipLabel}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8884d8"
            dot={false}
            name="Price"
          />
          <Line
            type="monotone"
            dataKey="shortMA"
            stroke="#82ca9d"
            dot={false}
            name={`${shortPeriod} MA`}
          />
          <Line
            type="monotone"
            dataKey="longMA"
            stroke="#ffc658"
            dot={false}
            name={`${longPeriod} MA`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 