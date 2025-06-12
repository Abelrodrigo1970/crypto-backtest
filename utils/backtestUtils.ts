import { Kline, Trade, BacktestResult } from '../types';

export const calculateSMA = (data: number[], period: number): number[] => {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
};

export const runBacktest = (
  klines: Kline[],
  shortPeriod: number,
  longPeriod: number,
  initialCapital: number,
  tradePercentage: number
): BacktestResult => {
  const closes = klines.map(k => k.close);
  const shortMA = calculateSMA(closes, shortPeriod);
  const longMA = calculateSMA(closes, longPeriod);

  const trades: Trade[] = [];
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let currentCapital = initialCapital;
  const capitalHistory: { time: number; capital: number }[] = [
    { time: klines[0].openTime, capital: initialCapital }
  ];

  for (let i = longPeriod; i < klines.length; i++) {
    const currentPrice = klines[i].close;
    const currentTime = klines[i].openTime;

    if (shortMA[i] > longMA[i] && shortMA[i - 1] <= longMA[i - 1]) {
      if (position === 'SHORT') {
        const profit = entryPrice - currentPrice;
        const tradeAmount = (currentCapital * tradePercentage) / 100;
        const tradeProfit = (profit / entryPrice) * tradeAmount;
        currentCapital += tradeProfit;

        trades.push({
          entryTime,
          exitTime: currentTime,
          entryPrice,
          exitPrice: currentPrice,
          profit: tradeProfit,
          type: 'SHORT',
          capital: currentCapital,
        });

        capitalHistory.push({ time: currentTime, capital: currentCapital });
      }
      position = 'LONG';
      entryPrice = currentPrice;
      entryTime = currentTime;
    } else if (shortMA[i] < longMA[i] && shortMA[i - 1] >= longMA[i - 1]) {
      if (position === 'LONG') {
        const profit = currentPrice - entryPrice;
        const tradeAmount = (currentCapital * tradePercentage) / 100;
        const tradeProfit = (profit / entryPrice) * tradeAmount;
        currentCapital += tradeProfit;

        trades.push({
          entryTime,
          exitTime: currentTime,
          entryPrice,
          exitPrice: currentPrice,
          profit: tradeProfit,
          type: 'LONG',
          capital: currentCapital,
        });

        capitalHistory.push({ time: currentTime, capital: currentCapital });
      }
      position = 'SHORT';
      entryPrice = currentPrice;
      entryTime = currentTime;
    }
  }

  const totalProfit = currentCapital - initialCapital;
  const winningTrades = trades.filter(trade => trade.profit > 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  let maxDrawdown = 0;
  let peak = initialCapital;
  let currentValue = initialCapital;

  capitalHistory.forEach(({ capital }) => {
    if (capital > peak) {
      peak = capital;
    }
    const drawdown = ((peak - capital) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return {
    trades,
    totalProfit,
    winRate,
    maxDrawdown,
    capital: initialCapital,
    finalCapital: currentCapital,
    capitalHistory,
  };
}; 