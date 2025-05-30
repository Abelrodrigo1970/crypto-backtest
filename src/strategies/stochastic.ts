import { Strategy, StrategyParams } from './types';
import { Kline, Trade } from '../types';

const calculateStochastic = (klines: Kline[], kPeriod: number, dPeriod: number) => {
  const kValues: number[] = [];
  const dValues: number[] = [];

  for (let i = kPeriod - 1; i < klines.length; i++) {
    const periodHigh = Math.max(...klines.slice(i - kPeriod + 1, i + 1).map(k => k.high));
    const periodLow = Math.min(...klines.slice(i - kPeriod + 1, i + 1).map(k => k.low));
    const currentClose = klines[i].close;

    const k = ((currentClose - periodLow) / (periodHigh - periodLow)) * 100;
    kValues.push(k);
  }

  // Calculate D (SMA of K)
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const d = kValues.slice(i - dPeriod + 1, i + 1).reduce((sum, val) => sum + val, 0) / dPeriod;
    dValues.push(d);
  }

  return { kValues, dValues };
};

const calculateMaxDrawdown = (trades: Trade[]): number => {
  let maxDrawdown = 0;
  let peak = trades[0]?.capital || 0;
  
  for (const trade of trades) {
    if (trade.capital > peak) {
      peak = trade.capital;
    }
    const drawdown = ((peak - trade.capital) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
};

export const stochasticStrategy: Strategy = {
  name: 'Stochastic Strategy',
  description: 'Strategy based on Stochastic oscillator signals',
  defaultParams: {
    kPeriod: 14,
    dPeriod: 3,
    overbought: 80,
    oversold: 20,
    initialCapital: 1000,
    tradePercentage: 10
  },
  run: (klines: Kline[], params: StrategyParams) => {
    const trades: Trade[] = [];
    let currentCapital = params.initialCapital;

    const { kValues, dValues } = calculateStochastic(
      klines,
      params.kPeriod || 14,
      params.dPeriod || 3
    );

    let position: 'LONG' | 'SHORT' | null = null;
    let entryPrice = 0;
    let entryTime = 0;

    const startIndex = params.kPeriod! + params.dPeriod! - 2;

    for (let i = startIndex; i < klines.length; i++) {
      const currentPrice = klines[i].close;
      const currentTime = klines[i].openTime;
      const kIndex = i - startIndex;
      const currentK = kValues[kIndex];
      const currentD = dValues[kIndex];
      const prevK = kValues[kIndex - 1];
      const prevD = dValues[kIndex - 1];

      // Buy signal: K crosses above D in oversold region
      if (currentK > currentD && prevK <= prevD && currentK < (params.oversold || 20) && position !== 'LONG') {
        if (position === 'SHORT') {
          const profit = entryPrice - currentPrice;
          trades.push({
            entryTime,
            exitTime: currentTime,
            entryPrice,
            exitPrice: currentPrice,
            profit: profit,
            type: 'SHORT',
            capital: currentCapital
          });
          currentCapital += profit;
        }
        position = 'LONG';
        entryPrice = currentPrice;
        entryTime = currentTime;
      }
      // Sell signal: K crosses below D in overbought region
      else if (currentK < currentD && prevK >= prevD && currentK > (params.overbought || 80) && position !== 'SHORT') {
        if (position === 'LONG') {
          const profit = currentPrice - entryPrice;
          trades.push({
            entryTime,
            exitTime: currentTime,
            entryPrice,
            exitPrice: currentPrice,
            profit: profit,
            type: 'LONG',
            capital: currentCapital
          });
          currentCapital += profit;
        }
        position = 'SHORT';
        entryPrice = currentPrice;
        entryTime = currentTime;
      }
    }

    return {
      trades,
      totalProfit: trades.reduce((sum, trade) => sum + trade.profit, 0),
      winRate: trades.filter(trade => trade.profit > 0).length / trades.length,
      maxDrawdown: calculateMaxDrawdown(trades),
      capitalHistory: trades.map(trade => trade.capital)
    };
  }
};