import { Kline } from '../types';

export const calculateReturns = (klines: Kline[]): number[] => {
  return klines.map((kline, index) => {
    if (index === 0) return 0;
    const previousClose = klines[index - 1].close;
    return ((kline.close - previousClose) / previousClose) * 100;
  });
};

export const calculateDrawdown = (capitalHistory: number[]): number => {
  let maxDrawdown = 0;
  let peak = capitalHistory[0];

  for (const capital of capitalHistory) {
    if (capital > peak) {
      peak = capital;
    }
    const drawdown = ((peak - capital) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown;
};

export const calculateSharpeRatio = (returns: number[]): number => {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  return stdDev === 0 ? 0 : mean / stdDev;
}; 