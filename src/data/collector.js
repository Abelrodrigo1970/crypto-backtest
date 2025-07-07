const axios = require('axios');
const moment = require('moment');
const logger = require('../utils/logger');
const { validateSymbol, validateKlineData } = require('../utils/validation');

class DataCollector {
  constructor() {
    // Base URL para API de futuros da Binance
    this.futuresBaseUrl = 'https://fapi.binance.com';
    
    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms entre requests
  }

  /**
   * Controle de rate limiting
   */
  async rateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Obtém todos os pares de futuros disponíveis na Binance
   * @returns {Array} Lista de pares de trading
   */
  async getFuturesPairs() {
    try {
      await this.rateLimitDelay();
      
      logger.info('Obtendo lista de pares de futuros da Binance...');
      
      const response = await axios.get(`${this.futuresBaseUrl}/fapi/v1/exchangeInfo`);
      const exchangeInfo = response.data;
      
      // Filtrar apenas pares ativos
      const activePairs = exchangeInfo.symbols
        .filter(symbol => 
          symbol.status === 'TRADING' && 
          symbol.quoteAsset === 'USDT'
        )
        .map(symbol => ({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          status: symbol.status,
          maintMarginPercent: parseFloat(symbol.maintMarginPercent),
          requiredMarginPercent: parseFloat(symbol.requiredMarginPercent)
        }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));

      logger.info(`Encontrados ${activePairs.length} pares de futuros ativos`);
      
      return activePairs;
      
    } catch (error) {
      logger.error('Erro ao obter pares de futuros:', error);
      throw new Error(`Falha ao obter pares de futuros: ${error.message}`);
    }
  }

  /**
   * Obtém dados históricos de klines para um símbolo específico
   * @param {string} symbol - Símbolo do par (ex: BTCUSDT)
   * @param {string} interval - Timeframe (15m, 1h, 2h, 4h)
   * @param {number} days - Número de dias de histórico
   * @returns {Array} Array de dados OHLCV
   */
  async getHistoricalData(symbol, interval, days) {
    try {
      if (!validateSymbol(symbol)) {
        throw new Error(`Símbolo inválido: ${symbol}`);
      }

      // Calcular quantos candles esperamos
      const intervalMinutes = this.getIntervalMinutes(interval);
      const expectedCandles = Math.ceil((days * 24 * 60) / intervalMinutes);
      
      logger.info(`Obtendo dados históricos para ${symbol} (${interval}, ${days} dias) - ~${expectedCandles} candles esperados`);
      
      const endTime = moment().valueOf();
      const startTime = moment().subtract(days, 'days').valueOf();
      
      let allData = [];
      let currentStartTime = startTime;
      let requestCount = 0;
      const maxRequests = Math.ceil(expectedCandles / 1400) + 2; // Margem de segurança
      
      // Fazer requisições progressivas do passado para o presente
      while (currentStartTime < endTime && requestCount < maxRequests) {
        await this.rateLimitDelay();
        
        const url = `${this.futuresBaseUrl}/fapi/v1/klines`;
        const params = {
          symbol: symbol,
          interval: interval,
          startTime: currentStartTime,
          endTime: endTime,
          limit: 1500
        };

        const response = await axios.get(url, { params });
        const klines = response.data;

        if (!validateKlineData(klines) || klines.length === 0) {
          break;
        }

        // Converter para formato mais amigável
        const formattedData = klines.map(kline => ({
          timestamp: parseInt(kline[0]),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5]),
          closeTime: parseInt(kline[6]),
          quoteVolume: parseFloat(kline[7]),
          trades: parseInt(kline[8]),
          buyBaseVolume: parseFloat(kline[9]),
          buyQuoteVolume: parseFloat(kline[10])
        }));

        // Adicionar dados novos, evitando duplicatas
        if (requestCount === 0) {
          allData = formattedData;
        } else {
          // Filtrar apenas candles que não temos ainda (timestamp maior que o último que temos)
          const latestTimestamp = allData[allData.length - 1] ? allData[allData.length - 1].timestamp : currentStartTime;
          const newData = formattedData.filter(candle => candle.timestamp > latestTimestamp);
          allData = allData.concat(newData);
        }

        requestCount++;

        // Se recebemos menos de 1500 candles, chegamos ao fim dos dados disponíveis
        if (klines.length < 1500) {
          break;
        }

        // Verificar se já temos dados suficientes para o período solicitado
        const newestCandle = allData[allData.length - 1];
        if (newestCandle && newestCandle.timestamp >= endTime - (intervalMinutes * 60 * 1000)) {
          break;
        }

        // Para a próxima requisição, começar logo após o último candle obtido
        if (formattedData.length > 0) {
          currentStartTime = formattedData[formattedData.length - 1].timestamp + 1;
        } else {
          break;
        }

        // Pausa adicional entre requisições múltiplas
        if (requestCount > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Ordenar por timestamp (mais antigo primeiro) - já deve estar ordenado, mas garantir
      allData.sort((a, b) => a.timestamp - b.timestamp);

      // Filtrar apenas dados dentro do período solicitado
      const filteredData = allData.filter(candle => 
        candle.timestamp >= startTime && candle.timestamp <= endTime
      );

      logger.info(`Obtidos ${filteredData.length} candles para ${symbol} (${requestCount} requisições)`);
      
      if (filteredData.length > 0) {
        const firstDate = moment(filteredData[0].timestamp).format('DD/MM/YYYY HH:mm');
        const lastDate = moment(filteredData[filteredData.length - 1].timestamp).format('DD/MM/YYYY HH:mm');
        logger.info(`Período real dos dados para ${symbol}: ${firstDate} até ${lastDate}`);
      }
      
      return filteredData;
      
    } catch (error) {
      logger.error(`Erro ao obter dados históricos para ${symbol}:`, error);
      throw new Error(`Falha ao obter dados para ${symbol}: ${error.message}`);
    }
  }

  /**
   * Converte string de intervalo para minutos
   * @param {string} interval - Intervalo (ex: 15m, 1h, 2h, 4h)
   * @returns {number} Número de minutos
   */
  getIntervalMinutes(interval) {
    const intervalMap = {
      '1m': 1,
      '3m': 3,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '2h': 120,
      '4h': 240,
      '6h': 360,
      '8h': 480,
      '12h': 720,
      '1d': 1440
    };
    
    return intervalMap[interval] || 15; // Default para 15m se não encontrar
  }

  /**
   * Obtém dados históricos para múltiplos símbolos
   * @param {Array} symbols - Array de símbolos
   * @param {string} interval - Timeframe
   * @param {number} days - Número de dias
   * @returns {Object} Objeto com dados por símbolo
   */
  async getMultipleHistoricalData(symbols, interval, days) {
    const results = {};
    const errors = {};
    
    logger.info(`Iniciando coleta de dados para ${symbols.length} símbolos`);
    
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      
      try {
        // Progress indicator
        const progress = ((i + 1) / symbols.length * 100).toFixed(1);
        console.log(`📊 Coletando dados: ${symbol} (${i + 1}/${symbols.length} - ${progress}%)`);
        
        const data = await this.getHistoricalData(symbol, interval, days);
        results[symbol] = data;
        
        // Pequena pausa entre requests para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        logger.warn(`Falha ao obter dados para ${symbol}:`, error.message);
        errors[symbol] = error.message;
        continue;
      }
    }
    
    const successCount = Object.keys(results).length;
    const errorCount = Object.keys(errors).length;
    
    logger.info(`Coleta concluída: ${successCount} sucessos, ${errorCount} erros`);
    
    if (errorCount > 0) {
      logger.warn('Símbolos com erro:', Object.keys(errors));
    }
    
    return {
      data: results,
      errors: errors,
      summary: {
        total: symbols.length,
        success: successCount,
        failed: errorCount
      }
    };
  }

  /**
   * Verifica se um símbolo existe e está ativo
   * @param {string} symbol - Símbolo a verificar
   * @returns {boolean} True se o símbolo é válido e ativo
   */
  async isValidSymbol(symbol) {
    try {
      const pairs = await this.getFuturesPairs();
      return pairs.some(pair => pair.symbol === symbol && pair.status === 'TRADING');
    } catch (error) {
      logger.error(`Erro ao verificar símbolo ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Obtém informações atuais do mercado para um símbolo
   * @param {string} symbol - Símbolo do par
   * @returns {Object} Informações do ticker
   */
  async getMarketInfo(symbol) {
    try {
      await this.rateLimitDelay();
      
      const url = `${this.futuresBaseUrl}/fapi/v1/ticker/24hr`;
      const response = await axios.get(url, { 
        params: { symbol: symbol }
      });
      
      const ticker = response.data;
      
      return {
        symbol: ticker.symbol,
        price: parseFloat(ticker.lastPrice),
        priceChange: parseFloat(ticker.priceChange),
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        volume: parseFloat(ticker.volume),
        quoteVolume: parseFloat(ticker.quoteVolume),
        openPrice: parseFloat(ticker.openPrice),
        highPrice: parseFloat(ticker.highPrice),
        lowPrice: parseFloat(ticker.lowPrice),
        count: parseInt(ticker.count)
      };
      
    } catch (error) {
      logger.error(`Erro ao obter info do mercado para ${symbol}:`, error);
      throw new Error(`Falha ao obter info do mercado: ${error.message}`);
    }
  }
}

module.exports = DataCollector; 