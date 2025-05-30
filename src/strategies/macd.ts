import { Strategy, StrategyParams } from './types';
import { Kline, Trade, Timeframe } from '../types';
import { calculateTradeSize } from '../utils/timeframeUtils';

const calculateEMA = (prices: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  ema[0] = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
  }

  return ema;
};

const calculateMACD = (prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

  return { macdLine, signalLine, histogram };
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

export const macdStrategy: Strategy = {
  name: 'MACD Strategy',
  description: 'Strategy based on MACD crossover signals',
  defaultParams: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    initialCapital: 1000,
    tradePercentage: 10
  },
  run: (klines: Kline[], params: StrategyParams, timeframe: Timeframe) => {
    const trades: Trade[] = [];
    let currentCapital = params.initialCapital;

    const closes = klines.map(k => k.close);
    const { macdLine, signalLine, histogram } = calculateMACD(
      closes,
      params.fastPeriod || 12,
      params.slowPeriod || 26,
      params.signalPeriod || 9
    );

    let position: 'LONG' | 'SHORT' | null = null;
    let entryPrice = 0;
    let entryTime = 0;

    for (let i = params.slowPeriod || 26; i < klines.length; i++) {
      const currentPrice = klines[i].close;
      const currentTime = klines[i].openTime;
      const currentMACD = macdLine[i];
      const currentSignal = signalLine[i];
      const currentHistogram = histogram[i];
      const prevHistogram = histogram[i - 1];

      // Calculate trade size based on current capital and timeframe
      const tradeSize = calculateTradeSize(currentCapital, params.tradePercentage, timeframe);

      // Buy signal: MACD crosses above signal line
      if (currentHistogram > 0 && prevHistogram <= 0 && position !== 'LONG') {
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
      // Sell signal: MACD crosses below signal line
      else if (currentHistogram < 0 && prevHistogram >= 0 && position !== 'SHORT') {
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