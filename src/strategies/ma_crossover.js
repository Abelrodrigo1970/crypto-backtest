const { SMA } = require('technicalindicators');
const logger = require('../utils/logger');

class MovingAverageCrossoverStrategy {
  constructor(config) {
    this.fastPeriod = config.fastPeriod || 10;
    this.slowPeriod = config.slowPeriod || 30;
    this.stopLoss = config.stopLoss || 0;
    this.takeProfit = config.takeProfit || 0;
    
    this.position = null;
    this.entryPrice = 0;
    this.entryTime = 0;
    this.trades = [];
    this.signals = [];
    
    logger.info(`Estratégia MA Crossover inicializada: Fast=${this.fastPeriod}, Slow=${this.slowPeriod}`);
  }

  generateSignals(data) {
    if (!data || data.length < this.slowPeriod) {
      throw new Error(`Dados insuficientes. Necessário pelo menos ${this.slowPeriod} candles`);
    }

    const closePrices = data.map(candle => candle.close);
    
    const fastMA = SMA.calculate({
      period: this.fastPeriod,
      values: closePrices
    });
    
    const slowMA = SMA.calculate({
      period: this.slowPeriod,
      values: closePrices
    });

    const signals = [];
    
    // CORREÇÃO: Ajustar a lógica dos índices
    for (let i = 1; i < slowMA.length; i++) {
      const currentFastMA = fastMA[i + (this.slowPeriod - this.fastPeriod)];
      const currentSlowMA = slowMA[i];
      const previousFastMA = fastMA[i - 1 + (this.slowPeriod - this.fastPeriod)];
      const previousSlowMA = slowMA[i - 1];
      
      // Índice correto no array de dados original
      const dataIndex = this.slowPeriod - 1 + i;
      
      // CORREÇÃO: Verificar se o índice está válido
      if (dataIndex >= data.length || !data[dataIndex]) {
        break;
      }
      
      const currentCandle = data[dataIndex];
      
      let signal = null;
      let signalType = 'hold';

      if (previousFastMA <= previousSlowMA && currentFastMA > currentSlowMA) {
        signal = 'buy';
        signalType = 'crossover_up';
      }
      else if (previousFastMA >= previousSlowMA && currentFastMA < currentSlowMA) {
        signal = 'sell';
        signalType = 'crossover_down';
      }

      signals.push({
        timestamp: currentCandle.timestamp,
        price: currentCandle.close,
        signal: signal,
        signalType: signalType,
        fastMA: currentFastMA,
        slowMA: currentSlowMA,
        volume: currentCandle.volume
      });
    }

    this.signals = signals;
    logger.info(`Gerados ${signals.length} sinais para estratégia MA Crossover`);
    
    return signals;
  }

  backtest(signals, initialCapital = 1000) {
    let capital = initialCapital;
    let position = null; // 'long', 'short' ou null
    let positionSize = 0;
    let entryPrice = 0;
    let entryTime = 0;
    const trades = [];
    let totalFees = 0;
    const feeRate = 0.001;
    const positionSizePercentage = 0.20; // 20% do capital por trade

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      
      // Verificar se deve sair da posição atual (stop loss ou take profit)
      if (position && this.shouldExitPosition(signal.price, entryPrice, position)) {
        const exitReason = this.getExitReason(signal.price, entryPrice, position);
        const trade = this.closeTrade(signal, entryPrice, entryTime, positionSize, exitReason, feeRate, position);
        trades.push(trade);
        capital += trade.pnl - trade.fees;
        totalFees += trade.fees;
        position = null;
        positionSize = 0;
      }

      // Lógica de sinais bidirecionais
      if (signal.signal === 'buy') {
        if (position === 'short') {
          // Fechar posição SHORT
          const trade = this.closeTrade(signal, entryPrice, entryTime, positionSize, 'signal', feeRate, 'short');
          trades.push(trade);
          capital += trade.pnl - trade.fees;
          totalFees += trade.fees;
          position = null;
          positionSize = 0;
        }
        
        if (!position) {
          // Abrir posição LONG
          position = 'long';
          entryPrice = signal.price;
          entryTime = signal.timestamp;
          
          const capitalForPosition = capital * positionSizePercentage;
          positionSize = capitalForPosition / signal.price;
          
          const fees = positionSize * signal.price * feeRate;
          capital -= fees;
          totalFees += fees;
        }
        
      } else if (signal.signal === 'sell') {
        if (position === 'long') {
          // Fechar posição LONG
          const trade = this.closeTrade(signal, entryPrice, entryTime, positionSize, 'signal', feeRate, 'long');
          trades.push(trade);
          capital += trade.pnl - trade.fees;
          totalFees += trade.fees;
          position = null;
          positionSize = 0;
        }
        
        if (!position) {
          // Abrir posição SHORT
          position = 'short';
          entryPrice = signal.price;
          entryTime = signal.timestamp;
          
          const capitalForPosition = capital * positionSizePercentage;
          positionSize = capitalForPosition / signal.price;
          
          const fees = positionSize * signal.price * feeRate;
          capital -= fees;
          totalFees += fees;
        }
      }
    }

    // Fechar posição pendente no final do período
    if (position && positionSize > 0) {
      const lastSignal = signals[signals.length - 1];
      const trade = this.closeTrade(lastSignal, entryPrice, entryTime, positionSize, 'end_of_period', feeRate, position);
      trades.push(trade);
      capital += trade.pnl - trade.fees;
      totalFees += trade.fees;
    }

    this.trades = trades;

    return {
      initialCapital,
      finalCapital: capital,
      totalReturn: ((capital - initialCapital) / initialCapital) * 100,
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.pnl > 0).length,
      losingTrades: trades.filter(t => t.pnl < 0).length,
      winRate: trades.length > 0 ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100 : 0,
      totalFees,
      trades: trades
    };
  }

  shouldExitPosition(currentPrice, entryPrice, positionType) {
    if (positionType === 'long') {
      const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      if (this.stopLoss > 0 && priceChange <= -this.stopLoss) {
        return true;
      }
      
      if (this.takeProfit > 0 && priceChange >= this.takeProfit) {
        return true;
      }
    } else if (positionType === 'short') {
      const priceChange = ((entryPrice - currentPrice) / entryPrice) * 100;
      
      if (this.stopLoss > 0 && priceChange <= -this.stopLoss) {
        return true;
      }
      
      if (this.takeProfit > 0 && priceChange >= this.takeProfit) {
        return true;
      }
    }
    
    return false;
  }

  getExitReason(currentPrice, entryPrice, positionType) {
    if (positionType === 'long') {
      const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      if (this.stopLoss > 0 && priceChange <= -this.stopLoss) {
        return 'stop_loss';
      }
      
      if (this.takeProfit > 0 && priceChange >= this.takeProfit) {
        return 'take_profit';
      }
    } else if (positionType === 'short') {
      const priceChange = ((entryPrice - currentPrice) / entryPrice) * 100;
      
      if (this.stopLoss > 0 && priceChange <= -this.stopLoss) {
        return 'stop_loss';
      }
      
      if (this.takeProfit > 0 && priceChange >= this.takeProfit) {
        return 'take_profit';
      }
    }
    
    return 'unknown';
  }

  closeTrade(exitSignal, entryPrice, entryTime, positionSize, exitReason, feeRate, positionType) {
    const exitPrice = exitSignal.price;
    const exitTime = exitSignal.timestamp;
    
    let pnl, returnPct;
    
    if (positionType === 'long') {
      // P&L para posição LONG: ganho quando preço sobe
      pnl = (exitPrice - entryPrice) * positionSize;
      returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    } else if (positionType === 'short') {
      // P&L para posição SHORT: ganho quando preço desce
      pnl = (entryPrice - exitPrice) * positionSize;
      returnPct = ((entryPrice - exitPrice) / entryPrice) * 100;
    }
    
    const fees = positionSize * exitPrice * feeRate;
    const duration = exitTime - entryTime;

    return {
      entryTime,
      exitTime,
      duration,
      entryPrice,
      exitPrice,
      positionSize,
      positionType, // Adicionar tipo da posição
      pnl,
      fees,
      returnPct,
      exitReason
    };
  }

  getDetailedStats() {
    if (!this.trades || this.trades.length === 0) {
      return null;
    }

    const trades = this.trades;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;

    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    for (const trade of trades) {
      runningPnL += trade.pnl;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      totalPnL,
      avgWin,
      avgLoss,
      profitFactor: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : Infinity,
      maxDrawdown,
      avgTradeDuration: trades.reduce((sum, t) => sum + t.duration, 0) / trades.length
    };
  }

  reset() {
    this.position = null;
    this.entryPrice = 0;
    this.entryTime = 0;
    this.trades = [];
    this.signals = [];
  }
}

module.exports = MovingAverageCrossoverStrategy;
