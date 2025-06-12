// src/strategies/movingAverages.ts
import { Strategy, StrategyParams } from './types';
import { Kline, Trade, Timeframe } from '../types';
import { calculateTradeSize } from '../utils/timeframeUtils';

const calculateSMA = (prices: number[], period: number): number[] => {
  const sma: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
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

export const movingAveragesStrategy: Strategy = {
  name: 'Moving Averages Strategy',
  description: 'Strategy based on Simple Moving Average crossover signals',
  defaultParams: {
    shortPeriod: 7,
    longPeriod: 21,
    initialCapital: 1000,
    tradePercentage: 10
  },
  run: (klines: Kline[], params: StrategyParams) => {
    const trades: Trade[] = [];
    let currentCapital = params.initialCapital;

    const closes = klines.map(k => k.close);
    const shortSMA = calculateSMA(closes, params.shortPeriod || 7);
    const longSMA = calculateSMA(closes, params.longPeriod || 21);

    let position: 'LONG' | 'SHORT' | null = null;
    let entryPrice = 0;
    let entryTime = 0;

    const startIndex = params.longPeriod || 21;

    for (let i = startIndex; i < klines.length; i++) {
      const currentPrice = klines[i].close;
      const currentTime = klines[i].openTime;
      const smaIndex = i - startIndex;
      const currentShortSMA = shortSMA[smaIndex];
      const currentLongSMA = longSMA[smaIndex];
      const prevShortSMA = shortSMA[smaIndex - 1];
      const prevLongSMA = longSMA[smaIndex - 1];

      // Calculate trade size based on current capital
      const tradeSize = calculateTradeSize(currentCapital, params.tradePercentage);

      // Buy signal: Short SMA crosses above Long SMA
      if (currentShortSMA > currentLongSMA && prevShortSMA <= prevLongSMA && position !== 'LONG') {
        if (position === 'SHORT') {
          const profit = (entryPrice - currentPrice) * (tradeSize / entryPrice);
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
      // Sell signal: Short SMA crosses below Long SMA
      else if (currentShortSMA < currentLongSMA && prevShortSMA >= prevLongSMA && position !== 'SHORT') {
        if (position === 'LONG') {
          const profit = (currentPrice - entryPrice) * (tradeSize / entryPrice);
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