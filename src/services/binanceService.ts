import { Kline, Timeframe } from '../types';

interface BinanceSymbol {
  symbol: string;
  status: string;
  quoteAsset: string;
  contractType?: string;
  isSpotTradingAllowed?: boolean;
  isMarginTradingAllowed?: boolean;
}

interface BinanceKline {
  0: number;  // openTime
  1: string;  // open
  2: string;  // high
  3: string;  // low
  4: string;  // close
  5: string;  // volume
  6: number;  // closeTime
  7: string;  // quoteAssetVolume
  8: number;  // numberOfTrades
  9: string;  // takerBuyBaseAssetVolume
  10: string; // takerBuyQuoteAssetVolume
  11: number; // ignore
}

interface ExchangeInfo {
  symbols: BinanceSymbol[];
}

const FUTURES_BASE_URL = 'https://fapi.binance.com/fapi/v1';

export const binanceService = {
  async getSymbols(): Promise<string[]> {
    try {
      // Fetch futures symbols
      const futuresResponse = await fetch(`${FUTURES_BASE_URL}/exchangeInfo`);
      const futuresData: ExchangeInfo = await futuresResponse.json();

      // Filter and map futures symbols
      const futuresSymbols = futuresData.symbols
        .filter(symbol => 
          symbol.status === 'TRADING' && 
          symbol.quoteAsset === 'USDT' &&
          symbol.contractType === 'PERPETUAL' // Only perpetual futures
        )
        .map(symbol => symbol.symbol);

      // Add some popular indices
      const additionalSymbols = [
        'GIGAUSDT',
        'SPXUSDT',
        'NDXUSDT',
        'DOWUSDT'
      ];

      return [...futuresSymbols, ...additionalSymbols].sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error('Error fetching symbols:', error);
      throw error;
    }
  },

  async getKlines(symbol: string, timeframe: Timeframe, startTime: number, endTime: number): Promise<Kline[]> {
    try {
      const allKlines: BinanceKline[] = [];
      let currentStartTime = startTime;
      
      // Continue fetching until we reach the end time
      while (currentStartTime < endTime) {
        const params = new URLSearchParams({
          symbol,
          interval: timeframe,
          startTime: currentStartTime.toString(),
          endTime: endTime.toString(),
          limit: '1000'
        });

        const response = await fetch(`${FUTURES_BASE_URL}/klines?${params}`);
        const data: BinanceKline[] = await response.json();
        
        if (data.length === 0) break;
        
        allKlines.push(...data);
        
        // Update start time for next request
        // Add 1ms to avoid duplicate candles
        currentStartTime = data[data.length - 1][0] + 1;
        
        // If we got less than 1000 candles, we've reached the end
        if (data.length < 1000) break;
      }

      return allKlines.map(kline => ({
        openTime: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        closeTime: kline[6],
        quoteAssetVolume: parseFloat(kline[7]),
        numberOfTrades: kline[8],
        takerBuyBaseAssetVolume: parseFloat(kline[9]),
        takerBuyQuoteAssetVolume: parseFloat(kline[10]),
        ignore: kline[11]
      }));
    } catch (error) {
      console.error('Error fetching klines:', error);
      throw error;
    }
  }
}; 