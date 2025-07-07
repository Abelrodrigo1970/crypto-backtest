const logger = require('../utils/logger');

class MetricsCalculator {
  constructor() {
    this.logger = logger;
  }

  // Funções utilitárias para substituir lodash
  mean(arr) {
    return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
  }

  min(arr) {
    return arr.length > 0 ? Math.min(...arr) : 0;
  }

  max(arr) {
    return arr.length > 0 ? Math.max(...arr) : 0;
  }

  sum(arr) {
    return arr.reduce((sum, val) => sum + val, 0);
  }

  orderBy(arr, key, direction = 'asc') {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (direction === 'desc') {
        return bVal - aVal;
      }
      return aVal - bVal;
    });
  }

  /**
   * Calcula métricas gerais para todos os resultados de backtest
   * @param {Object} backtestResults - Resultados dos backtests por símbolo
   * @returns {Object} Métricas agregadas
   */
  calculateOverallMetrics(backtestResults) {
    const symbols = Object.keys(backtestResults);
    
    if (symbols.length === 0) {
      // Retornar métricas vazias em vez de falhar
      return {
        totalSymbols: 0,
        profitableSymbols: 0,
        successRate: 0,
        averageReturn: 0,
        medianReturn: 0,
        stdDevReturn: 0,
        minReturn: 0,
        maxReturn: 0,
        bestPerformer: { symbol: 'N/A', return: 0 },
        worstPerformer: { symbol: 'N/A', return: 0 },
        topPerformers: [],
        totalTrades: 0,
        totalWinningTrades: 0,
        totalLosingTrades: 0,
        overallWinRate: 0,
        maxDrawdown: 0,
        averageDrawdown: 0,
        averageProfitFactor: 0,
        averageTradeDuration: 0,
        performanceDistribution: {
          'loss_high': 0,
          'loss_medium': 0,
          'loss_low': 0,
          'gain_low': 0,
          'gain_medium': 0,
          'gain_high': 0
        },
        signalVolumeCorrelation: 0,
        detailedResults: []
      };
    }

    // Extrair dados básicos
    const results = symbols.map(symbol => {
      const result = backtestResults[symbol];
      return {
        symbol,
        return: result.backtest.totalReturn,
        finalCapital: result.backtest.finalCapital,
        initialCapital: result.backtest.initialCapital,
        trades: result.backtest.totalTrades,
        winningTrades: result.backtest.winningTrades,
        losingTrades: result.backtest.losingTrades,
        winRate: result.backtest.winRate,
        totalFees: result.backtest.totalFees,
        maxDrawdown: result.stats ? result.stats.maxDrawdown : 0,
        profitFactor: result.stats ? result.stats.profitFactor : 0,
        avgTradeDuration: result.stats ? result.stats.avgTradeDuration : 0,
        dataPoints: result.dataPoints,
        signalCount: result.signalCount
      };
    });

    // Métricas básicas
    const totalSymbols = results.length;
    const profitableSymbols = results.filter(r => r.return > 0).length;
    const successRate = (profitableSymbols / totalSymbols) * 100;

    // Estatísticas de retorno
    const returns = results.map(r => r.return);
    const averageReturn = this.mean(returns);
    const medianReturn = this.calculateMedian(returns);
    const stdDevReturn = this.calculateStandardDeviation(returns);
    const minReturn = this.min(returns);
    const maxReturn = this.max(returns);

    // Identificar melhores e piores performers
    const sortedByReturn = this.orderBy(results, 'return', 'desc');
    const bestPerformer = sortedByReturn[0];
    const worstPerformer = sortedByReturn[sortedByReturn.length - 1];

    // Estatísticas de trading
    const totalTrades = this.sum(results.map(r => r.trades));
    const totalWinningTrades = this.sum(results.map(r => r.winningTrades));
    const totalLosingTrades = this.sum(results.map(r => r.losingTrades));
    const overallWinRate = totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0;

    // Métricas de risco
    const maxDrawdowns = results.map(r => r.maxDrawdown).filter(d => d > 0);
    const maxDrawdown = maxDrawdowns.length > 0 ? this.max(maxDrawdowns) : 0;
    const averageDrawdown = maxDrawdowns.length > 0 ? this.mean(maxDrawdowns) : 0;

    // Profit Factor médio
    const profitFactors = results.map(r => r.profitFactor).filter(pf => pf > 0 && pf !== Infinity);
    const averageProfitFactor = profitFactors.length > 0 ? this.mean(profitFactors) : 0;

    // Duração média dos trades
    const tradeDurations = results.map(r => r.avgTradeDuration).filter(d => d > 0);
    const averageTradeDuration = tradeDurations.length > 0 ? this.mean(tradeDurations) : 0;

    // Distribuição de performance
    const performanceDistribution = this.calculatePerformanceDistribution(results);

    // Top performers (todos os pares ordenados por retorno - maior para menor)
    const topPerformers = sortedByReturn;

    // Correlação entre volume de sinais e performance
    const signalVolumeCorrelation = this.calculateCorrelation(
      results.map(r => r.signalCount),
      results.map(r => r.return)
    );

    return {
      // Estatísticas gerais
      totalSymbols,
      profitableSymbols,
      successRate,
      
      // Estatísticas de retorno
      averageReturn,
      medianReturn,
      stdDevReturn,
      minReturn,
      maxReturn,
      
      // Performers
      bestPerformer,
      worstPerformer,
      topPerformers,
      
      // Trading stats
      totalTrades,
      totalWinningTrades,
      totalLosingTrades,
      overallWinRate,
      
      // Métricas de risco
      maxDrawdown,
      averageDrawdown,
      averageProfitFactor,
      averageTradeDuration,
      
      // Análises avançadas
      performanceDistribution,
      signalVolumeCorrelation,
      
      // Dados detalhados
      detailedResults: results
    };
  }

  /**
   * Calcula distribuição de performance por faixas
   */
  calculatePerformanceDistribution(results) {
    const distribution = {
      'loss_high': 0,     // < -10%
      'loss_medium': 0,   // -10% a -5%
      'loss_low': 0,      // -5% a 0%
      'gain_low': 0,      // 0% a 5%
      'gain_medium': 0,   // 5% a 15%
      'gain_high': 0      // > 15%
    };

    results.forEach(result => {
      const ret = result.return;
      if (ret < -10) distribution.loss_high++;
      else if (ret < -5) distribution.loss_medium++;
      else if (ret < 0) distribution.loss_low++;
      else if (ret < 5) distribution.gain_low++;
      else if (ret < 15) distribution.gain_medium++;
      else distribution.gain_high++;
    });

    return distribution;
  }

  /**
   * Calcula métricas específicas para uma estratégia
   */
  calculateStrategyMetrics(backtestResults, strategyType) {
    const metrics = this.calculateOverallMetrics(backtestResults);
    
    // Métricas específicas por tipo de estratégia
    switch (strategyType) {
      case 'ma_crossover':
        return this.calculateMACrossoverMetrics(backtestResults, metrics);
      case 'rsi':
        return this.calculateRSIMetrics(backtestResults, metrics);
      default:
        return metrics;
    }
  }

  /**
   * Métricas específicas para estratégia de cruzamento de MAs
   */
  calculateMACrossoverMetrics(backtestResults, baseMetrics) {
    const symbols = Object.keys(backtestResults);
    
    // Analisar efetividade dos cruzamentos
    let totalCrossoverSignals = 0;
    let profitableCrossovers = 0;

    symbols.forEach(symbol => {
      const result = backtestResults[symbol];
      const signals = result.signals || [];
      
      const crossoverSignals = signals.filter(s => 
        s.signalType === 'crossover_up' || s.signalType === 'crossover_down'
      );
      
      totalCrossoverSignals += crossoverSignals.length;
      
      // Aproximação: assumir que trades lucrativos vieram de crossovers efetivos
      if (result.backtest.totalReturn > 0) {
        profitableCrossovers += crossoverSignals.length;
      }
    });

    const crossoverEffectiveness = totalCrossoverSignals > 0 ? 
      (profitableCrossovers / totalCrossoverSignals) * 100 : 0;

    return {
      ...baseMetrics,
      strategySpecific: {
        totalCrossoverSignals,
        crossoverEffectiveness,
        avgCrossoversPerSymbol: totalCrossoverSignals / symbols.length
      }
    };
  }

  /**
   * Métricas específicas para estratégia RSI
   */
  calculateRSIMetrics(backtestResults, baseMetrics) {
    const symbols = Object.keys(backtestResults);
    
    let totalOversoldSignals = 0;
    let totalOverboughtSignals = 0;
    let divergenceSignals = 0;

    symbols.forEach(symbol => {
      const result = backtestResults[symbol];
      const signals = result.signals || [];
      
      signals.forEach(signal => {
        if (signal.signalType === 'oversold_exit') totalOversoldSignals++;
        if (signal.signalType === 'overbought_entry') totalOverboughtSignals++;
        if (signal.signalType === 'bullish_divergence' || 
            signal.signalType === 'bearish_divergence') divergenceSignals++;
      });
    });

    return {
      ...baseMetrics,
      strategySpecific: {
        totalOversoldSignals,
        totalOverboughtSignals,
        divergenceSignals,
        oversoldToOverboughtRatio: totalOverboughtSignals > 0 ? 
          totalOversoldSignals / totalOverboughtSignals : 0
      }
    };
  }

  /**
   * Calcula correlação entre duas séries de dados
   */
  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const sumX = this.sum(x);
    const sumY = this.sum(y);
    const sumXY = this.sum(x.map((xi, i) => xi * y[i]));
    const sumX2 = this.sum(x.map(xi => xi * xi));
    const sumY2 = this.sum(y.map(yi => yi * yi));

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calcula mediana de um array
   */
  calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 ? 
      sorted[mid] : 
      (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calcula desvio padrão
   */
  calculateStandardDeviation(arr) {
    const mean = this.mean(arr);
    const squaredDiffs = arr.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(this.mean(squaredDiffs));
  }

  /**
   * Calcula métricas de risco ajustadas
   */
  calculateRiskAdjustedMetrics(returns, riskFreeRate = 0) {
    const avgReturn = this.mean(returns);
    const stdDev = this.calculateStandardDeviation(returns);
    
    // Sharpe Ratio
    const sharpeRatio = stdDev !== 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
    
    // Sortino Ratio (considera apenas volatilidade negativa)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideDeviation = negativeReturns.length > 0 ? 
      this.calculateStandardDeviation(negativeReturns) : 0;
    const sortinoRatio = downsideDeviation !== 0 ? 
      (avgReturn - riskFreeRate) / downsideDeviation : 0;

    return {
      sharpeRatio,
      sortinoRatio,
      volatility: stdDev
    };
  }

  /**
   * Gera relatório de análise de performance
   */
  generatePerformanceReport(metrics) {
    const report = {
      executionDate: new Date().toISOString(),
      summary: {
        totalSymbols: metrics.totalSymbols,
        successRate: metrics.successRate,
        averageReturn: metrics.averageReturn,
        bestPerformer: metrics.bestPerformer,
        worstPerformer: metrics.worstPerformer
      },
      riskMetrics: {
        maxDrawdown: metrics.maxDrawdown,
        averageDrawdown: metrics.averageDrawdown,
        volatility: metrics.stdDevReturn
      },
      tradingMetrics: {
        totalTrades: metrics.totalTrades,
        overallWinRate: metrics.overallWinRate,
        averageProfitFactor: metrics.averageProfitFactor
      },
      distribution: metrics.performanceDistribution
    };

    logger.info('Performance report generated', report);
    return report;
  }
}

module.exports = MetricsCalculator; 