import { Timeframe } from '../types';

export const getRequiredCandles = (timeframe: Timeframe): number => {
  switch (timeframe) {
    case '1m':
      return 60; // 1 hora
    case '3m':
      return 20; // 1 hora
    case '5m':
      return 12; // 1 hora
    case '15m':
      return 4;  // 1 hora
    case '30m':
      return 2;  // 1 hora
    case '1h':
      return 1;  // 1 hora
    case '2h':
      return 0.5; // 1 hora
    case '4h':
      return 0.25; // 1 hora
    case '6h':
      return 0.167; // 1 hora
    case '8h':
      return 0.125; // 1 hora
    case '12h':
      return 0.083; // 1 hora
    case '1d':
      return 0.042; // 1 hora
    case '3d':
      return 0.014; // 1 hora
    case '1w':
      return 0.006; // 1 hora
    case '1M':
      return 0.001; // 1 hora
    default:
      return 1;
  }
};

export const calculateTradeSize = (capital: number, tradePercentage: number, timeframe: Timeframe): number => {
  const requiredCandles = getRequiredCandles(timeframe);
  return (capital * (tradePercentage / 100)) * requiredCandles;
};