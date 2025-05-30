export interface Symbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
  ignore: number;
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  profit: number;
  capital: number;
}

export interface BacktestResult {
  trades: Trade[];
  totalProfit: number;
  winRate: number;
  maxDrawdown: number;
  capital: number;
  finalCapital: number;
  capitalHistory: {
    time: number;
    capital: number;
  }[];
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

export interface BacktestConfig {
  symbol: string;
  timeframe: Timeframe;
  startDate: Date;
  endDate: Date;
  shortPeriod: number;
  longPeriod: number;
} 