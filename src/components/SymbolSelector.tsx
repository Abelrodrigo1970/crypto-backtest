import React, { useState } from 'react';
import { Timeframe } from '../types';

export interface SymbolSelectorProps {
  selectedSymbol: string;
  selectedTimeframe: Timeframe;
  startDate: Date;
  endDate: Date;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onDateRangeChange: (start: Date, end: Date) => void;
  availableSymbols: string[];
}

const timeframes: Timeframe[] = [
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'
];

export const SymbolSelector: React.FC<SymbolSelectorProps> = ({
  selectedSymbol,
  selectedTimeframe,
  startDate,
  endDate,
  onSymbolChange,
  onTimeframeChange,
  onDateRangeChange,
  availableSymbols
}) => {
  const [start, setStart] = useState(startDate.toISOString().slice(0, 10));
  const [end, setEnd] = useState(endDate.toISOString().slice(0, 10));

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSymbolChange(e.target.value);
  };

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTimeframeChange(e.target.value as Timeframe);
  };

  const handleDateChange = () => {
    onDateRangeChange(new Date(start), new Date(end));
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Symbol & Timeframe</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
          <select
            value={selectedSymbol}
            onChange={handleSymbolChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">Select a symbol</option>
            {availableSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
          <select
            value={selectedTimeframe}
            onChange={handleTimeframeChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          >
            {timeframes.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        <button
          onClick={handleDateChange}
          className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105"
        >
          Apply Date Range
        </button>
      </div>
    </div>
  );
}; 