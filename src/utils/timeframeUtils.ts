import { Timeframe } from '../types';

export const calculateTradeSize = (capital: number, tradePercentage: number): number => {
  return capital * (tradePercentage / 100);
};

export const timeframeToMilliseconds = (timeframe: Timeframe): number => {
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));
  
  switch (unit) {
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

export const millisecondsToTimeframe = (ms: number): Timeframe => {
  if (ms < 60 * 1000) return '1m';
  if (ms < 60 * 60 * 1000) return '5m';
  if (ms < 24 * 60 * 60 * 1000) return '1h';
  if (ms < 7 * 24 * 60 * 60 * 1000) return '1d';
  return '1w';
}; 