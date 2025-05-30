// aa
import React from 'react';
import { strategies } from '../strategies';

interface StrategySelectorProps {
  selectedStrategy: string;
  onStrategyChange: (strategy: string) => void;
  onParamsChange: (params: Record<string, number>) => void;
}

const getParamLabel = (param: string): string => {
  const labels: Record<string, string> = {
    shortPeriod: 'Short Period (SMA)',
    longPeriod: 'Long Period (SMA)',
    fastPeriod: 'Fast Period (MACD)',
    slowPeriod: 'Slow Period (MACD)',
    signalPeriod: 'Signal Period (MACD)',
    kPeriod: 'K Period (Stochastic)',
    dPeriod: 'D Period (Stochastic)',
    rsiPeriod: 'RSI Period',
    overbought: 'Overbought Level',
    oversold: 'Oversold Level'
  };
  return labels[param] || param.charAt(0).toUpperCase() + param.slice(1);
};

export const StrategySelector: React.FC<StrategySelectorProps> = ({
  selectedStrategy,
  onStrategyChange,
  onParamsChange
}) => {
  const handleStrategyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const strategy = event.target.value;
    onStrategyChange(strategy);
    onParamsChange(strategies[strategy].defaultParams);
  };

  const handleParamChange = (param: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onParamsChange({ [param]: numValue });
    }
  };

  const renderParamInputs = () => {
    const strategy = strategies[selectedStrategy];
    if (!strategy) return null;

    return Object.entries(strategy.defaultParams).map(([param, value]) => {
      if (param === 'initialCapital' || param === 'tradePercentage') return null;

      return (
        <div key={param} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {getParamLabel(param)}
          </label>
          <input
            type="number"
            min="1"
            value={value}
            onChange={(e) => handleParamChange(param, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      );
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Strategy Selection</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Strategy
          </label>
          <select
            value={selectedStrategy}
            onChange={handleStrategyChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          >
            {Object.entries(strategies).map(([key, strategy]) => (
              <option key={key} value={key}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        {selectedStrategy && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg">
              {strategies[selectedStrategy].description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderParamInputs()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};