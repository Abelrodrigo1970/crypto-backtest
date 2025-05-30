// src/strategies/index.ts
export * from './types';
export { movingAveragesStrategy } from './movingAverages';
export { rsiStrategy } from './rsi';
export { macdStrategy } from './macd';
export { stochasticStrategy } from './stochastic';

import { Strategy } from './types';
import { movingAveragesStrategy } from './movingAverages';
import { rsiStrategy } from './rsi';
import { macdStrategy } from './macd';
import { stochasticStrategy } from './stochastic';

export const strategies: Record<string, Strategy> = {
  movingAverages: movingAveragesStrategy,
  rsi: rsiStrategy,
  macd: macdStrategy,
  stochastic: stochasticStrategy
};