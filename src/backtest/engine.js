const DataCollector = require('../data/collector');
const MovingAverageCrossoverStrategy = require('../strategies/ma_crossover');
const SMIStrategy = require('../strategies/smi');
const MetricsCalculator = require('../metrics/calculator');
const ResultsExporter = require('../utils/exporter');
const logger = require('../utils/logger');
const colors = require('colors');
const cliProgress = require('cli-progress');
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
      
      if (!isWebMode) {
        console.log(colors.cyan('🚀 Iniciando Backtest...'));
        console.log(colors.yellow(`📊 Estratégia: ${this.getStrategyName()}`));
        console.log(colors.yellow(`⏰ Timeframe: ${this.config.timeframe}`));
        console.log(colors.yellow(`📅 Período: ${this.config.backtestDays} dias\n`));
      }

      // 1. Obter lista de pares
      const pairs = await this.getPairs();
      
      // 2. Coletar dados históricos
      const historicalData = await this.collectHistoricalData(pairs);
      
      // 3. Executar backtest para cada par
      const backtestResults = await this.runBacktests(historicalData);
      
      // 4. Calcular métricas e estatísticas
      const metrics = this.calculateMetrics(backtestResults);
      
      if (isWebMode) {
        // Para web, retornar dados
        return metrics;
      } else {
        // Para CLI, exibir e exportar
        // 5. Exibir resultados
        this.displayResults(metrics);
        
        // 6. Exportar resultados
        await this.exportResults(metrics);
        
        console.log(colors.green('\n✅ Backtest concluído com sucesso!'));
      }
      
    } catch (error) {
      logger.error('Erro durante execução do backtest:', error);
      if (process.stdout.isTTY) {
        console.error(colors.red(`❌ Erro: ${error.message}`));
      }
      throw error;
    }
  }

  /**
   * Obtém lista de pares para backtest
   */
  async getPairs() {
    console.log(colors.cyan('📋 Obtendo lista de pares ordenados por volume...'));
    
    try {
      // Obtém dados de volume 24h dos futures
      const axios = require('axios');
      const futures24hResponse = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr');
      
      // Filtra apenas pares USDT ativos e ordena por volume
      const rankedPairs = futures24hResponse.data
        .filter(ticker => 
          ticker.symbol.endsWith('USDT') && 
          parseFloat(ticker.quoteVolume) > 0
        )
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, 250) // Pega os 250 primeiros
        .map(ticker => ticker.symbol);
      
      console.log(colors.green(`✅ Top 250 pares USDT selecionados por volume 24h`));
      console.log(colors.yellow(`🏆 Top 5: ${rankedPairs.slice(0, 5).join(', ')}`));
      
      // Log dos volumes dos top 10 para referência
      const top10WithVolume = futures24hResponse.data
        .filter(ticker => rankedPairs.slice(0, 10).includes(ticker.symbol))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .map(ticker => ({
          symbol: ticker.symbol,
          volume: this.formatVolume(parseFloat(ticker.quoteVolume))
        }));
      
      console.log(colors.cyan('\n📊 Top 10 por volume:'));
      top10WithVolume.forEach((pair, index) => {
        console.log(colors.white(`   ${(index + 1).toString().padStart(2)}: ${pair.symbol.padEnd(12)} - ${pair.volume}`));
      });
      
      logger.info(`Top 250 pares USDT selecionados: ${rankedPairs.slice(0, 10).join(', ')}...`);
      
      return rankedPairs;
      
    } catch (error) {
      logger.error('Erro ao obter ranking de pares:', error);
      console.log(colors.yellow('⚠️  Erro ao obter ranking, usando pares padrão...'));
      
      // Fallback para pares populares se houver erro
      const fallbackPairs = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT',
        'XRPUSDT', 'LTCUSDT', 'BCHUSDT', 'LINKUSDT', 'EOSUSDT',
        'TRXUSDT', 'ETCUSDT', 'XLMUSDT', 'XMRUSDT', 'DASUSDT'
      ];
      
      console.log(colors.green(`✅ ${fallbackPairs.length} pares padrão selecionados`));
      return fallbackPairs;
    }
  }

  /**
   * Formata volume para exibição
   */
  formatVolume(volume) {
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(1)}B`;
    } else if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    } else {
      return `$${volume.toFixed(0)}`;
    }
  }

  /**
   * Coleta dados históricos para todos os pares
   */
  async collectHistoricalData(pairs) {
    const isWebMode = !process.stdout.isTTY;
    
    if (!isWebMode) {
      console.log(colors.cyan('\n📊 Coletando dados históricos...'));
    }
    
    let progressBar;
    if (!isWebMode) {
      progressBar = new cliProgress.SingleBar({
        format: 'Coletando dados |{bar}| {percentage}% | {value}/{total} pares | {eta}s restantes',
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true
      });
      progressBar.start(pairs.length, 0);
    }

    const result = await this.dataCollector.getMultipleHistoricalData(
      pairs,
      this.config.timeframe,
      this.config.backtestDays
    );

    if (!isWebMode) {
      progressBar.update(pairs.length);
      progressBar.stop();
      console.log(colors.green(`✅ Dados coletados: ${result.summary.success} sucessos, ${result.summary.failed} falhas`));
      
      if (result.summary.failed > 0) {
        console.log(colors.yellow('⚠️  Pares com falha:'), Object.keys(result.errors).join(', '));
      }
    }

    return result.data;
  }

  /**
   * Executa backtest para cada par
   */
  async runBacktests(historicalData) {
    const symbols = Object.keys(historicalData);
    const isWebMode = this.isWebMode || !process.stdout.isTTY;
    
    if (!isWebMode) {
      console.log(colors.cyan(`\n🔄 Executando backtest para ${symbols.length} pares...`));
    }

    let progressBar;
    if (!isWebMode) {
      progressBar = new cliProgress.SingleBar({
        format: 'Backtest |{bar}| {percentage}% | {value}/{total} pares | ETA: {eta}s',
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true
      });
      progressBar.start(symbols.length, 0);
    }

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
        if (!isWebMode) {
          progressBar.update(++processed);
        }

      } catch (error) {
        logger.error(`Erro ao processar ${symbol}:`, error);
        failed++;
        if (!isWebMode) progressBar.update(++processed);
        continue;
      }
    }

    if (!isWebMode) {
      progressBar.stop();
      console.log(colors.green(`✅ Backtest concluído: ${successful} sucessos, ${failed} falhas`));
    } else {
      logger.info(`Backtest concluído: ${successful} sucessos, ${failed} falhas`);
    }
    
    this.results = results;
    
    return results;
  }

  /**
   * Calcula métricas agregadas
   */
  calculateMetrics(backtestResults) {
    const isWebMode = !process.stdout.isTTY;
    
    if (!isWebMode) {
      console.log(colors.cyan('\n📈 Calculando métricas...'));
    }
    
    const metrics = this.metricsCalculator.calculateOverallMetrics(backtestResults);
    this.overallStats = metrics;
    
    if (!isWebMode) {
      console.log(colors.green('✅ Métricas calculadas'));
    }
    
    return metrics;
  }

  /**
   * Exibe resultados na tela
   */
  displayResults(metrics) {
    console.log(colors.cyan('\n📊 RESULTADOS DO BACKTEST'));
    console.log('='.repeat(50));

    // Estatísticas gerais
    console.log(colors.yellow('\n📈 ESTATÍSTICAS GERAIS:'));
    console.log(`├─ Pares testados: ${colors.white(metrics.totalSymbols)}`);
    console.log(`├─ Retorno médio: ${this.formatPercentage(metrics.averageReturn)}`);
    console.log(`├─ Melhor performance: ${colors.green(metrics.bestPerformer.symbol)} (${this.formatPercentage(metrics.bestPerformer.return)})`);
    console.log(`├─ Pior performance: ${colors.red(metrics.worstPerformer.symbol)} (${this.formatPercentage(metrics.worstPerformer.return)})`);
    console.log(`├─ Taxa de sucesso: ${this.formatPercentage(metrics.successRate)}`);
    console.log(`└─ Drawdown máximo: ${this.formatPercentage(metrics.maxDrawdown)}`);

    // Top 20 performances ordenadas por ganho
    console.log(colors.yellow('\n🏆 RANKING POR MAIOR GANHO (Top 20):'));
    metrics.topPerformers.slice(0, 20).forEach((result, index) => {
      const color = result.return > 0 ? colors.green : colors.red;
      const rankColor = index < 3 ? colors.yellow : colors.white;
      console.log(`${rankColor((index + 1).toString().padStart(2))}. ${result.symbol.padEnd(12)} | ${color(this.formatPercentage(result.return).padStart(8))} | ${result.trades.toString().padStart(3)} trades | Win: ${this.formatPercentage(result.winRate).padStart(7)}`);
    });

    // Estatísticas de trading
    console.log(colors.yellow('\n💼 ESTATÍSTICAS DE TRADING:'));
    console.log(`├─ Total de trades: ${colors.white(metrics.totalTrades)}`);
    console.log(`├─ Trades vencedores: ${colors.green(metrics.totalWinningTrades)}`);
    console.log(`├─ Trades perdedores: ${colors.red(metrics.totalLosingTrades)}`);
    console.log(`├─ Win rate geral: ${this.formatPercentage(metrics.overallWinRate)}`);
    console.log(`├─ Profit factor médio: ${colors.white(metrics.averageProfitFactor.toFixed(2))}`);
    console.log(`└─ Duração média dos trades: ${colors.white(this.formatDuration(metrics.averageTradeDuration))}`);
  }

  /**
   * Exporta resultados nos formatos solicitados
   */
  async exportResults(metrics) {
    console.log(colors.cyan('\n💾 Exportando resultados...'));
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const baseFilename = `backtest_${this.config.strategy}_${this.config.timeframe}_${timestamp}`;

    try {
      if (this.config.exportFormat === 'csv' || this.config.exportFormat === 'both') {
        await this.resultsExporter.exportToCSV(this.results, metrics, `results/${baseFilename}.csv`);
        console.log(colors.green(`✅ Resultados exportados para CSV: results/${baseFilename}.csv`));
      }

      if (this.config.exportFormat === 'json' || this.config.exportFormat === 'both') {
        await this.resultsExporter.exportToJSON(this.results, metrics, `results/${baseFilename}.json`);
        console.log(colors.green(`✅ Resultados exportados para JSON: results/${baseFilename}.json`));
      }

      // Exportar também um resumo em texto
      await this.resultsExporter.exportSummary(metrics, `results/${baseFilename}_summary.txt`);
      console.log(colors.green(`✅ Resumo exportado para: results/${baseFilename}_summary.txt`));

      // Exportar resultados detalhados por símbolo
      await this.resultsExporter.exportDetailedResults(this.results, timestamp);

    } catch (error) {
      logger.error('Erro ao exportar resultados:', error);
      console.error(colors.red('❌ Erro ao exportar resultados'));
    }
  }

  /**
   * Obtém nome da estratégia para exibição
   */
  getStrategyName() {
    switch (this.config.strategy) {
      case 'ma_crossover':
        return `Cruzamento de Médias Móveis (${this.config.fastPeriod}/${this.config.slowPeriod})`;
      case 'rsi':
        return `RSI (${this.config.rsiPeriod}, ${this.config.oversoldLevel}/${this.config.overboughtLevel})`;
      default:
        return 'Desconhecida';
    }
  }

  /**
   * Formata percentual para exibição
   */
  formatPercentage(value) {
    const color = value >= 0 ? colors.green : colors.red;
    return color(`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`);
  }

  /**
   * Formata duração em milissegundos para formato legível
   */
  formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else {
      return `${hours}h`;
    }
  }

  /**
   * Obtém estatísticas resumidas
   */
  getSummary() {
    if (!this.overallStats) {
      return null;
    }

    return {
      strategy: this.getStrategyName(),
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