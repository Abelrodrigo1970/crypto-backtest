const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class ResultsExporter {
  constructor() {
    const resultsDir = 'results';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
  }

  async exportToCSV(results, metrics, filePath) {
    try {
      const records = Object.keys(results).map(symbol => {
        const result = results[symbol];
        return {
          symbol,
          return: result.backtest.totalReturn,
          trades: result.backtest.totalTrades,
          winRate: result.backtest.winRate,
          maxDrawdown: result.stats ? result.stats.maxDrawdown : 0
        };
      });

      // Ordenar por retorno (maior para menor)
      const sortedRecords = records.sort((a, b) => b.return - a.return);

      const headers = ['Rank', 'Symbol', 'Return (%)', 'Total Trades', 'Win Rate (%)', 'Max Drawdown (%)'];
      const csvLines = [
        headers.join(','),
        ...sortedRecords.map((record, index) => [
          index + 1,
          record.symbol,
          record.return.toFixed(2),
          record.trades,
          record.winRate.toFixed(2),
          record.maxDrawdown.toFixed(2)
        ].join(','))
      ];

      fs.writeFileSync(filePath, csvLines.join('\n'));
      logger.info('Resultados exportados para CSV: ' + filePath);
    } catch (error) {
      logger.error('Erro ao exportar para CSV:', error);
      throw error;
    }
  }

  async exportToJSON(results, metrics, filePath) {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        summary: metrics,
        detailedResults: results
      };

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      logger.info('Resultados exportados para JSON: ' + filePath);
    } catch (error) {
      logger.error('Erro ao exportar para JSON:', error);
      throw error;
    }
  }

  async exportSummary(metrics, filePath) {
    try {
      const summary = '=== RELATÓRIO DE BACKTEST ===\nData: ' + new Date().toLocaleString('pt-BR') + '\n\n📊 ESTATÍSTICAS GERAIS:\n├─ Pares testados: ' + metrics.totalSymbols + '\n├─ Taxa de sucesso: ' + metrics.successRate.toFixed(2) + '%\n├─ Retorno médio: ' + metrics.averageReturn.toFixed(2) + '%\n├─ Melhor performance: ' + metrics.bestPerformer.symbol + ' (' + metrics.bestPerformer.return.toFixed(2) + '%)\n└─ Pior performance: ' + metrics.worstPerformer.symbol + ' (' + metrics.worstPerformer.return.toFixed(2) + '%)\n\n💼 ESTATÍSTICAS DE TRADING:\n├─ Total de trades: ' + metrics.totalTrades + '\n├─ Win rate geral: ' + metrics.overallWinRate.toFixed(2) + '%\n└─ Drawdown máximo: ' + metrics.maxDrawdown.toFixed(2) + '%';

      fs.writeFileSync(filePath, summary);
      logger.info('Resumo exportado para texto: ' + filePath);
    } catch (error) {
      logger.error('Erro ao exportar resumo:', error);
      throw error;
    }
  }

  async exportDetailedResults(results, timestamp) {
    try {
      const detailedDir = path.join('results', 'detailed');
      if (!fs.existsSync(detailedDir)) {
        fs.mkdirSync(detailedDir, { recursive: true });
      }

      for (const [symbol, result] of Object.entries(results)) {
        if (!result.backtest || !result.backtest.trades || result.backtest.trades.length === 0) {
          continue;
        }

        const filePath = path.join(detailedDir, `${symbol}_${timestamp}_trades.txt`);
        const content = this.generateDetailedReport(symbol, result);
        
        fs.writeFileSync(filePath, content);
        logger.info(`Relatório detalhado criado para ${symbol}: ${filePath}`);
      }

      console.log(`✅ Relatórios detalhados criados em: ${detailedDir}`);
    } catch (error) {
      logger.error('Erro ao exportar resultados detalhados:', error);
      throw error;
    }
  }

  generateDetailedReport(symbol, result) {
    const trades = result.backtest.trades;
    const stats = result.stats;
    
    let report = `=============================================\n`;
    report += `           ${symbol} - RELATÓRIO DETALHADO\n`;
    report += `=============================================\n\n`;
    
    // Estatísticas gerais
    report += `📊 ESTATÍSTICAS GERAIS:\n`;
    report += `├─ Capital Inicial: $${result.backtest.initialCapital.toFixed(2)}\n`;
    report += `├─ Capital Final: $${result.backtest.finalCapital.toFixed(2)}\n`;
    report += `├─ Retorno Total: ${result.backtest.totalReturn.toFixed(2)}%\n`;
    report += `├─ Total de Trades: ${trades.length}\n`;
    report += `├─ Trades Vencedores: ${result.backtest.winningTrades}\n`;
    report += `├─ Trades Perdedores: ${result.backtest.losingTrades}\n`;
    report += `├─ Win Rate: ${result.backtest.winRate.toFixed(2)}%\n`;
    report += `├─ Total em Taxas: $${result.backtest.totalFees.toFixed(2)}\n`;
    
    if (stats) {
      report += `├─ Profit Factor: ${stats.profitFactor.toFixed(2)}\n`;
      report += `├─ Max Drawdown: ${stats.maxDrawdown.toFixed(2)}%\n`;
      report += `├─ Ganho Médio: $${stats.avgWin.toFixed(2)}\n`;
      report += `└─ Perda Média: $${stats.avgLoss.toFixed(2)}\n`;
    } else {
      report += `└─ Estatísticas detalhadas não disponíveis\n`;
    }
    
    report += `\n📈 LISTA DE TRADES (Estilo TradingView):\n`;
    report += `${'='.repeat(120)}\n`;
    report += `| # | Entrada         | Saída           | Direção | Preço Entrada | Preço Saída | Tamanho    | P&L        | Retorno % | Duração | Motivo      |\n`;
    report += `${'='.repeat(120)}\n`;
    
    trades.forEach((trade, index) => {
      const entryDate = new Date(trade.entryTime).toLocaleString('pt-BR');
      const exitDate = new Date(trade.exitTime).toLocaleString('pt-BR');
      const duration = this.formatTradeDuration(trade.duration);
      const pnlColor = trade.pnl >= 0 ? '+' : '';
      const returnColor = trade.returnPct >= 0 ? '+' : '';
      const positionDirection = trade.positionType ? trade.positionType.toUpperCase() : 'LONG';
      
      report += `| ${(index + 1).toString().padStart(2)} `;
      report += `| ${entryDate.padEnd(15)} `;
      report += `| ${exitDate.padEnd(15)} `;
      report += `| ${positionDirection.padEnd(7)} `;
      report += `| $${trade.entryPrice.toFixed(4).padStart(9)} `;
      report += `| $${trade.exitPrice.toFixed(4).padStart(9)} `;
      report += `| ${trade.positionSize.toFixed(4).padStart(8)} `;
      report += `| ${pnlColor}$${trade.pnl.toFixed(2).padStart(8)} `;
      report += `| ${returnColor}${trade.returnPct.toFixed(2).padStart(6)}% `;
      report += `| ${duration.padEnd(7)} `;
      report += `| ${this.getExitReasonText(trade.exitReason).padEnd(9)} |\n`;
    });
    
    report += `${'='.repeat(120)}\n`;
    
    // Resumo de P&L
    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    report += `\n💰 RESUMO P&L:\n`;
    report += `├─ P&L Total: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}\n`;
    report += `├─ P&L Trades Vencedores: +$${winningTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}\n`;
    report += `├─ P&L Trades Perdedores: $${losingTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}\n`;
    report += `├─ Maior Ganho: +$${Math.max(...trades.map(t => t.pnl)).toFixed(2)}\n`;
    report += `└─ Maior Perda: $${Math.min(...trades.map(t => t.pnl)).toFixed(2)}\n`;
    
    report += `\n📊 ANÁLISE DE DURAÇÃO:\n`;
    const durations = trades.map(t => t.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    report += `├─ Duração Média: ${this.formatTradeDuration(avgDuration)}\n`;
    report += `├─ Duração Máxima: ${this.formatTradeDuration(maxDuration)}\n`;
    report += `└─ Duração Mínima: ${this.formatTradeDuration(minDuration)}\n`;
    
    report += `\n${'-'.repeat(50)}\n`;
    report += `Relatório gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    
    return report;
  }

  formatTradeDuration(durationMs) {
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    } else {
      return `${hours}h`;
    }
  }

  getExitReasonText(reason) {
    const reasons = {
      'signal': 'Sinal',
      'stop_loss': 'Stop Loss',
      'take_profit': 'Take Pr.',
      'end_of_period': 'Fim Per.',
      'unknown': 'Desconh.'
    };
    return reasons[reason] || reason;
  }
}

module.exports = ResultsExporter;
