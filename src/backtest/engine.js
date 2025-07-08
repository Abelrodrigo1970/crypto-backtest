const DataCollector = require('../data/collector');
const MovingAverageCrossoverStrategy = require('../strategies/ma_crossover');
const SMIStrategy = require('../strategies/smi');
const MetricsCalculator = require('../metrics/calculator');
const ResultsExporter = require('../utils/exporter');
const logger = require('../utils/logger');
const axios = require('axios');

class BacktestEngine {
  constructor(config) {
    this.config = config;
    this.dataCollector = new DataCollector();
    this.metricsCalculator = new MetricsCalculator();
    this.resultsExporter = new ResultsExporter();
    
    // Inicializar estratégia baseada na configuração
    this.strategy = this.initializeStrategy(config);
    
    // Resultados
    this.results = {};
    this.overallStats = null;
    
    logger.info('BacktestEngine inicializado', { config });
  }

  /**
   * Inicializa a estratégia baseada na configuração
   */
  initializeStrategy(config) {
    switch (config.strategy) {
      case 'ma_crossover':
        return new MovingAverageCrossoverStrategy(config);
      case 'smi':
        return new SMIStrategy(config);
      default:
        throw new Error(`Estratégia não suportada: ${config.strategy}`);
    }
  }

  /**
   * Executa o backtest completo
   */
  async run() {
    try {
      const isWebMode = this.isWebMode || !process.stdout.isTTY;

      // 1. Obter lista de pares
      const pairs = await this.getPairs();
      
      // 2. Coletar dados históricos
      const historicalData = await this.collectHistoricalData(pairs);
      
      // 3. Executar backtest para cada par
      const backtestResults = await this.runBacktests(historicalData);
      
      // 4. Calcular métricas e estatísticas
      const metrics = this.calculateMetrics(backtestResults);
      
      // Para web, retornar dados
      return metrics;
      
    } catch (error) {
      logger.error('Erro durante execução do backtest:', error);
      throw error;
    }
  }

  /**
   * Obtém lista de pares para backtest
   */
  async getPairs() {
    try {
      // Obtém dados de volume 24h dos futures
      const futures24hResponse = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr');
      
      // Filtra apenas pares USDT ativos e ordena por volume
      const rankedPairs = futures24hResponse.data
        .filter(ticker => 
          ticker.symbol.endsWith('USDT') && 
          parseFloat(ticker.quoteVolume) > 0
        )
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, 30) // Pega os 30 primeiros
        .map(ticker => ticker.symbol);
      
      logger.info(`Top 30 pares USDT selecionados: ${rankedPairs.slice(0, 10).join(', ')}...`);
      
      return rankedPairs;
      
    } catch (error) {
      logger.error('Erro ao obter ranking de pares:', error);
      
      // Fallback para pares populares se houver erro
      const fallbackPairs = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT',
        'XRPUSDT', 'LTCUSDT', 'BCHUSDT', 'LINKUSDT', 'EOSUSDT',
        'TRXUSDT', 'ETCUSDT', 'XLMUSDT', 'XMRUSDT', 'DASUSDT'
      ];
      
      return fallbackPairs;
    }
  }



  /**
   * Coleta dados históricos para todos os pares
   */
  async collectHistoricalData(pairs) {
    const result = await this.dataCollector.getMultipleHistoricalData(
      pairs,
      this.config.timeframe,
      this.config.backtestDays
    );

    return result.data;
  }

  /**
   * Executa backtest para cada par
   */
  async runBacktests(historicalData) {
    const symbols = Object.keys(historicalData);

    const results = {};
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const symbol of symbols) {
      try {
        const data = historicalData[symbol];
        
        logger.info(`Processando ${symbol} com ${data ? data.length : 0} candles`);
        
        if (!data || data.length === 0) {
          logger.warn(`Dados insuficientes para ${symbol}`);
          failed++;
          if (!isWebMode) progressBar.update(++processed);
          continue;
        }

        // Verificar se há dados suficientes para a estratégia
        const minRequired = Math.max(this.config.slowPeriod || 30, this.config.fastPeriod || 10) + 10;
        if (data.length < minRequired) {
          logger.warn(`Dados insuficientes para ${symbol}: ${data.length} candles, necessário ${minRequired}`);
          failed++;
          if (!isWebMode) progressBar.update(++processed);
          continue;
        }

        // Reset da estratégia para cada símbolo
        logger.info(`Resetando estratégia para ${symbol}`);
        this.strategy.reset();

        // Gerar sinais
        logger.info(`Gerando sinais para ${symbol}`);
        const signals = this.strategy.generateSignals(data);
        logger.info(`Gerados ${signals.length} sinais para ${symbol}`);
        
        // Executar backtest
        logger.info(`Executando backtest para ${symbol}`);
        const backtestResult = this.strategy.backtest(signals, this.config.initialCapital || 10000);
        logger.info(`Backtest concluído para ${symbol}: ${backtestResult.totalTrades} trades`);
        
        // Calcular estatísticas detalhadas
        const detailedStats = this.strategy.getDetailedStats();

        results[symbol] = {
          symbol,
          data: data,
          signals: signals,
          backtest: backtestResult,
          stats: detailedStats,
          dataPoints: data.length,
          signalCount: signals.filter(s => s.signal !== null).length
        };

        successful++;

      } catch (error) {
        logger.error(`Erro ao processar ${symbol}:`, error);
        failed++;
        continue;
      }
    }

    logger.info(`Backtest concluído: ${successful} sucessos, ${failed} falhas`);
    
    this.results = results;
    
    return results;
  }

  /**
   * Calcula métricas agregadas
   */
  calculateMetrics(backtestResults) {
    const metrics = this.metricsCalculator.calculateOverallMetrics(backtestResults);
    this.overallStats = metrics;
    return metrics;
  }



  /**
   * Obtém estatísticas resumidas
   */
  getSummary() {
    if (!this.overallStats) {
      return null;
    }

    return {
      strategy: this.config.strategy,
      timeframe: this.config.timeframe,
      period: `${this.config.backtestDays} dias`,
      totalSymbols: this.overallStats.totalSymbols,
      averageReturn: this.overallStats.averageReturn,
      successRate: this.overallStats.successRate,
      bestPerformer: this.overallStats.bestPerformer,
      worstPerformer: this.overallStats.worstPerformer,
      totalTrades: this.overallStats.totalTrades,
      overallWinRate: this.overallStats.overallWinRate
    };
  }
}

module.exports = BacktestEngine; 