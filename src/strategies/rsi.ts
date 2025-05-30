import { Strategy, StrategyParams } from './types';
import { Kline, Trade } from '../types';

const calculateRSI = (prices: number[], period: number): number[] => {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Calculate RSI
  for (let i = period; i < prices.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;

    const rs = avgGain / avgLoss;
    const rsiValue = 100 - (100 / (1 + rs));
    rsi.push(rsiValue);
  }

  return rsi;
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

export const rsiStrategy: Strategy = {
  name: 'RSI Strategy',
  description: 'Strategy based on RSI overbought/oversold signals',
  defaultParams: {
    period: 14,
    overbought: 70,
    oversold: 30,
    initialCapital: 1000,
    tradePercentage: 10
  },
  run: (klines: Kline[], params: StrategyParams) => {
    const trades: Trade[] = [];
    let currentCapital = params.initialCapital;

    const closes = klines.map(k => k.close);
    const rsi = calculateRSI(closes, params.period || 14);

    let position: 'LONG' | 'SHORT' | null = null;
    let entryPrice = 0;
    let entryTime = 0;

    for (let i = params.period || 14; i < klines.length; i++) {
      const currentPrice = klines[i].close;
      const currentTime = klines[i].openTime;
      const currentRSI = rsi[i - params.period!];

      if (currentRSI < (params.oversold || 30) && position !== 'LONG') {
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
      } else if (currentRSI > (params.overbought || 70) && position !== 'SHORT') {
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