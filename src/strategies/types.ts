import { Kline, Trade } from '../types';

export interface StrategyParams {
  initialCapital: number;
  tradePercentage: number;
  [key: string]: number;
}

export interface StrategyResult {
  trades: Trade[];
  totalProfit: number;
  winRate: number;
  maxDrawdown: number;
  capitalHistory: number[];
}

export interface Strategy {
  name: string;
  description: string;
  defaultParams: StrategyParams;
  run: (klines: Kline[], params: StrategyParams) => StrategyResult;
}