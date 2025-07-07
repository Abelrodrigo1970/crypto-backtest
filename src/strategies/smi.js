const logger = require('../utils/logger');

class SMIStrategy {
    constructor(config) {
        this.config = config;
        this.period = parseInt(config.smiPeriod) || 14;
        this.oversoldLevel = parseInt(config.oversoldLevel) || -40;
        this.overboughtLevel = parseInt(config.overboughtLevel) || 40;
        this.signalPeriod = parseInt(config.signalPeriod) || 3;
        
        logger.info('Estratégia SMI inicializada:', {
            period: this.period,
            oversoldLevel: this.oversoldLevel,
            overboughtLevel: this.overboughtLevel,
            signalPeriod: this.signalPeriod
        });
    }

    /**
     * Calcula o SMI (Stochastic Momentum Index)
     */
    calculateSMI(candles) {
        if (candles.length < this.period) {
            return [];
        }

        const smiValues = [];
        const signalValues = [];

        for (let i = this.period - 1; i < candles.length; i++) {
            // Calcular o ponto médio do período
            const midPoint = (candles[i].high + candles[i].low) / 2;
            
            // Calcular o ponto médio de n períodos atrás
            const prevMidPoint = (candles[i - this.period + 1].high + candles[i - this.period + 1].low) / 2;
            
            // Calcular a diferença
            const diff = midPoint - prevMidPoint;
            
            // Encontrar o máximo e mínimo das diferenças no período
            let maxDiff = diff;
            let minDiff = diff;
            
            for (let j = 0; j < this.period; j++) {
                const currentMidPoint = (candles[i - j].high + candles[i - j].low) / 2;
                const currentPrevMidPoint = (candles[i - j - this.period + 1]?.high + candles[i - j - this.period + 1]?.low) / 2;
                const currentDiff = currentMidPoint - currentPrevMidPoint;
                
                if (currentDiff > maxDiff) maxDiff = currentDiff;
                if (currentDiff < minDiff) minDiff = currentDiff;
            }
            
            // Calcular o SMI
            const range = maxDiff - minDiff;
            const smi = range !== 0 ? (diff / range) * 100 : 0;
            
            smiValues.push(smi);
            
            // Calcular a linha de sinal (média móvel do SMI)
            if (smiValues.length >= this.signalPeriod) {
                const signalSum = smiValues.slice(-this.signalPeriod).reduce((sum, val) => sum + val, 0);
                const signal = signalSum / this.signalPeriod;
                signalValues.push(signal);
            } else {
                signalValues.push(smi);
            }
        }

        return { smi: smiValues, signal: signalValues };
    }

    /**
     * Gera sinais de compra e venda baseados no SMI
     */
    generateSignals(candles) {
        try {
            if (candles.length < this.period * 2) {
                logger.warn('Dados insuficientes para gerar sinais SMI');
                return [];
            }

            const { smi, signal } = this.calculateSMI(candles);
            const signals = [];

            // Gerar sinais baseados no cruzamento do SMI com a linha de sinal
            for (let i = 1; i < smi.length; i++) {
                const currentSMI = smi[i];
                const previousSMI = smi[i - 1];
                const currentSignal = signal[i];
                const previousSignal = signal[i - 1];

                // Sinal de compra: SMI cruza acima da linha de sinal e está em região de sobrevenda
                if (previousSMI <= previousSignal && currentSMI > currentSignal && currentSMI < this.oversoldLevel) {
                    signals.push({
                        type: 'buy',
                        timestamp: candles[i + this.period - 1].timestamp,
                        price: candles[i + this.period - 1].close,
                        smi: currentSMI,
                        signal: currentSignal,
                        reason: 'SMI oversold crossover'
                    });
                }
                // Sinal de venda: SMI cruza abaixo da linha de sinal e está em região de sobrecompra
                else if (previousSMI >= previousSignal && currentSMI < currentSignal && currentSMI > this.overboughtLevel) {
                    signals.push({
                        type: 'sell',
                        timestamp: candles[i + this.period - 1].timestamp,
                        price: candles[i + this.period - 1].close,
                        smi: currentSMI,
                        signal: currentSignal,
                        reason: 'SMI overbought crossover'
                    });
                }
                // Sinal adicional: divergência de sobrevenda
                else if (currentSMI < this.oversoldLevel && currentSMI > previousSMI) {
                    signals.push({
                        type: 'buy',
                        timestamp: candles[i + this.period - 1].timestamp,
                        price: candles[i + this.period - 1].close,
                        smi: currentSMI,
                        signal: currentSignal,
                        reason: 'SMI oversold divergence'
                    });
                }
                // Sinal adicional: divergência de sobrecompra
                else if (currentSMI > this.overboughtLevel && currentSMI < previousSMI) {
                    signals.push({
                        type: 'sell',
                        timestamp: candles[i + this.period - 1].timestamp,
                        price: candles[i + this.period - 1].close,
                        smi: currentSMI,
                        signal: currentSignal,
                        reason: 'SMI overbought divergence'
                    });
                }
            }

            logger.info(`Gerados ${signals.length} sinais para estratégia SMI`);
            return signals;

        } catch (error) {
            logger.error('Erro na geração de sinais SMI:', error);
            return [];
        }
    }

    /**
     * Executa o backtest com os sinais gerados
     */
    backtest(signals, initialCapital = 1000) {
        const feeRate = 0.0004; // 0.04% por trade
        const positionSizePercentage = 0.20; // 20% do capital por posição
        
        let capital = initialCapital;
        let position = null;
        let entryPrice = 0;
        let entryTime = 0;
        let positionSize = 0;
        let totalFees = 0;
        const trades = [];

        for (const signal of signals) {
            // Verificar se deve sair da posição atual por stop loss ou take profit
            if (position && positionSize > 0) {
                const shouldExit = this.shouldExitPosition(signal.price, entryPrice, position);
                if (shouldExit) {
                    const exitReason = this.getExitReason(signal.price, entryPrice, position);
                    const trade = this.closeTrade(signal, entryPrice, entryTime, positionSize, exitReason, feeRate, position);
                    trades.push(trade);
                    capital += trade.pnl - trade.fees;
                    totalFees += trade.fees;
                    position = null;
                    positionSize = 0;
                }
            }

            // Processar novo sinal
            if (signal.type === 'buy' && !position) {
                // Abrir posição LONG
                position = 'long';
                entryPrice = signal.price;
                entryTime = signal.timestamp;
                
                const capitalForPosition = capital * positionSizePercentage;
                positionSize = capitalForPosition / signal.price;
                
                const fees = positionSize * signal.price * feeRate;
                capital -= fees;
                totalFees += fees;
                
            } else if (signal.type === 'sell' && !position) {
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

        // Fechar posição pendente no final do período
        if (position && positionSize > 0 && signals.length > 0) {
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

    /**
     * Verifica se deve sair da posição por stop loss ou take profit
     */
    shouldExitPosition(currentPrice, entryPrice, positionType) {
        const stopLoss = this.config.stopLoss || 2;
        const takeProfit = this.config.takeProfit || 16;
        
        if (positionType === 'long') {
            const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
            
            if (stopLoss > 0 && priceChange <= -stopLoss) {
                return true;
            }
            
            if (takeProfit > 0 && priceChange >= takeProfit) {
                return true;
            }
        } else if (positionType === 'short') {
            // Para SHORT: perdemos quando o preço sobe, ganhamos quando desce
            const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
            
            if (stopLoss > 0 && priceChange >= stopLoss) {
                return true; // Preço subiu, perdemos (stop loss)
            }
            
            if (takeProfit > 0 && priceChange <= -takeProfit) {
                return true; // Preço desceu, ganhamos (take profit)
            }
        }
        
        return false;
    }

    /**
     * Obtém o motivo da saída da posição
     */
    getExitReason(currentPrice, entryPrice, positionType) {
        const stopLoss = this.config.stopLoss || 2;
        const takeProfit = this.config.takeProfit || 16;
        
        if (positionType === 'long') {
            const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
            
            if (stopLoss > 0 && priceChange <= -stopLoss) {
                return 'stop_loss';
            }
            
            if (takeProfit > 0 && priceChange >= takeProfit) {
                return 'take_profit';
            }
        } else if (positionType === 'short') {
            // Para SHORT: perdemos quando o preço sobe, ganhamos quando desce
            const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
            
            if (stopLoss > 0 && priceChange >= stopLoss) {
                return 'stop_loss'; // Preço subiu, perdemos
            }
            
            if (takeProfit > 0 && priceChange <= -takeProfit) {
                return 'take_profit'; // Preço desceu, ganhamos
            }
        }
        
        return 'unknown';
    }

    /**
     * Fecha um trade
     */
    closeTrade(exitSignal, entryPrice, entryTime, positionSize, exitReason, feeRate, positionType) {
        const exitPrice = exitSignal.price;
        const exitTime = exitSignal.timestamp;
        
        let pnl, returnPct;
        
        if (positionType === 'long') {
            pnl = (exitPrice - entryPrice) * positionSize;
            returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
        } else if (positionType === 'short') {
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
            positionType,
            pnl,
            fees,
            returnPct,
            exitReason
        };
    }

    /**
     * Obtém estatísticas detalhadas
     */
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

    /**
     * Reseta a estratégia para um novo símbolo
     */
    reset() {
        this.trades = [];
        logger.info('Resetando estratégia SMI');
    }

    /**
     * Obtém o nome da estratégia
     */
    getName() {
        return 'SMI';
    }
}

module.exports = SMIStrategy; 