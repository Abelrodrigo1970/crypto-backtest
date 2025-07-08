const express = require('express');
const cors = require('cors');
const path = require('path');
const BacktestEngine = require('./src/backtest/engine');
const DataCollector = require('./src/data/collector');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Servir arquivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Obter pares disponíveis
app.get('/api/pairs', async (req, res) => {
  try {
    const collector = new DataCollector();
    const pairs = await collector.getFuturesPairs();
    res.json({ success: true, pairs: pairs.slice(0, 50) }); // Limitar a 50 para performance
  } catch (error) {
    logger.error('Erro ao obter pares:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Executar backtest
app.post('/api/backtest', async (req, res) => {
  try {
    const config = req.body;
    
    // Validar configuração básica
    if (!config.strategy || !config.timeframe || !config.backtestDays) {
      return res.status(400).json({ 
        success: false, 
        error: 'Configuração incompleta' 
      });
    }

    logger.info('Iniciando backtest via API:', config);

    const engine = new BacktestEngine(config);
    
    // Forçar modo web para API
    engine.isWebMode = true;
    
    // Executar backtest de forma assíncrona
    const results = await engine.run();
    
    logger.info('Backtest concluído via API, resultados:', {
      totalSymbols: results?.totalSymbols,
      averageReturn: results?.averageReturn,
      profitableSymbols: results?.profitableSymbols
    });
    
    res.json({ 
      success: true, 
      results: results,
      config: config 
    });

  } catch (error) {
    logger.error('Erro no backtest via API:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API: Obter top pares por volume
app.get('/api/top-pairs/:count?', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 50;
    const collector = new DataCollector();
    const pairs = await collector.getFuturesPairs();
    
    // Ordenar por volume e pegar os top N
    const topPairs = pairs
      .sort((a, b) => b.quoteVolume - a.quoteVolume)
      .slice(0, count)
      .map(pair => pair.symbol);
    
    res.json({ 
      success: true, 
      pairs: topPairs 
    });
  } catch (error) {
    logger.error('Erro ao obter top pares:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Status da aplicação
app.get('/api/status', (req, res) => {
  res.json({ 
    success: true, 
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API: Obter trades detalhados de um símbolo
app.get('/api/trades/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe, backtestDays, strategy, ...strategyParams } = req.query;
    
    if (!symbol || !timeframe || !backtestDays || !strategy) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: symbol, timeframe, backtestDays, strategy' 
      });
    }

    logger.info(`Obtendo trades detalhados para ${symbol}:`, { timeframe, backtestDays, strategy });

    // Configurar engine para o símbolo específico
    const config = {
      strategy,
      timeframe,
      backtestDays: parseInt(backtestDays),
      initialCapital: 10000,
      ...strategyParams
    };

    const engine = new BacktestEngine(config);
    engine.isWebMode = true;
    
    // Coletar dados apenas para o símbolo específico
    const collector = new DataCollector();
    const historicalData = await collector.getHistoricalData(symbol, timeframe, parseInt(backtestDays));
    
    if (!historicalData || historicalData.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `Dados não encontrados para ${symbol}` 
      });
    }

    // Executar backtest apenas para este símbolo
    try {
      logger.info(`Iniciando backtest para ${symbol} com ${historicalData.length} candles`);
      const backtestResults = await engine.runBacktests({ [symbol]: historicalData });
      const symbolResult = backtestResults[symbol];
      
      if (!symbolResult) {
        logger.warn(`Resultado não encontrado para ${symbol} após backtest`);
        return res.status(404).json({ 
          success: false, 
          error: `Resultado não encontrado para ${symbol}` 
        });
      }
      
      logger.info(`Backtest concluído com sucesso para ${symbol}`);
      
      // Retornar os dados do backtest
      return res.json({
        success: true,
        data: {
          symbol: symbolResult.symbol,
          backtest: symbolResult.backtest,
          stats: symbolResult.stats,
          trades: symbolResult.backtest.trades || []
        }
      });
    } catch (error) {
      logger.error(`Erro durante backtest para ${symbol}:`, error);
      return res.status(500).json({ 
        success: false, 
        error: `Erro durante backtest: ${error.message}` 
      });
    }

    // Retornar dados detalhados
    const trades = symbolResult.backtest.trades || [];
    const signals = symbolResult.signals || [];
    
    res.json({ 
      success: true, 
      symbol,
      trades: trades.map(trade => ({
        ...trade,
        entryTime: new Date(trade.entryTime).toLocaleString(),
        exitTime: new Date(trade.exitTime).toLocaleString()
      })),
      signals: signals.slice(0, 50), // Limitar sinais para performance
      summary: {
        totalTrades: trades.length,
        winningTrades: trades.filter(t => t.pnl > 0).length,
        losingTrades: trades.filter(t => t.pnl < 0).length,
        totalReturn: symbolResult.backtest.totalReturn,
        winRate: symbolResult.backtest.winRate,
        totalFees: symbolResult.backtest.totalFees
      }
    });

  } catch (error) {
    logger.error(`Erro ao obter trades para ${req.params.symbol}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Interface web disponível em http://localhost:${PORT}`);
  logger.info(`Servidor iniciado na porta ${PORT}`);
});

module.exports = app; 