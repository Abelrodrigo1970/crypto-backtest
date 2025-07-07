const logger = require('./logger');

/**
 * Valida a configuração fornecida pelo usuário
 * @param {Object} config - Configuração a ser validada
 * @returns {boolean} - True se a configuração é válida
 */
function validateConfig(config) {
  const errors = [];

  // Validação do timeframe
  const validTimeframes = ['15m', '1h', '2h', '4h'];
  if (!config.timeframe || !validTimeframes.includes(config.timeframe)) {
    errors.push('Timeframe inválido. Deve ser: 15m, 1h, 2h ou 4h');
  }

  // Validação da estratégia
  const validStrategies = ['ma_crossover', 'rsi', 'macd', 'smi'];
  if (!config.strategy || !validStrategies.includes(config.strategy)) {
    errors.push('Estratégia inválida. Deve ser: ma_crossover, rsi, macd ou smi');
  }

  // Validação do período de backtest
  if (!config.backtestDays || config.backtestDays < 1 || config.backtestDays > 365) {
    errors.push('Período de backtest deve estar entre 1 e 365 dias');
  }

  // Validações específicas por estratégia
  if (config.strategy === 'ma_crossover') {
    if (!config.fastPeriod || config.fastPeriod < 1) {
      errors.push('Período da média móvel rápida deve ser positivo');
    }
    if (!config.slowPeriod || config.slowPeriod < 1) {
      errors.push('Período da média móvel lenta deve ser positivo');
    }
    if (config.fastPeriod >= config.slowPeriod) {
      errors.push('Período da média móvel rápida deve ser menor que a lenta');
    }
  }

  if (config.strategy === 'rsi') {
    if (!config.rsiPeriod || config.rsiPeriod < 1) {
      errors.push('Período do RSI deve ser positivo');
    }
    if (config.oversoldLevel < 0 || config.oversoldLevel > 100) {
      errors.push('Nível de sobrevenda deve estar entre 0 e 100');
    }
    if (config.overboughtLevel < 0 || config.overboughtLevel > 100) {
      errors.push('Nível de sobrecompra deve estar entre 0 e 100');
    }
    if (config.oversoldLevel >= config.overboughtLevel) {
      errors.push('Nível de sobrevenda deve ser menor que o de sobrecompra');
    }
  }

  if (config.strategy === 'macd') {
    if (!config.fastPeriod || config.fastPeriod < 1) {
      errors.push('Período rápido do MACD deve ser positivo');
    }
    if (!config.slowPeriod || config.slowPeriod < 1) {
      errors.push('Período lento do MACD deve ser positivo');
    }
    if (!config.signalPeriod || config.signalPeriod < 1) {
      errors.push('Período do signal do MACD deve ser positivo');
    }
    if (config.fastPeriod >= config.slowPeriod) {
      errors.push('Período rápido do MACD deve ser menor que o lento');
    }
  }

  if (config.strategy === 'smi') {
    if (!config.smiPeriod || config.smiPeriod < 1) {
      errors.push('Período do SMI deve ser positivo');
    }
    if (!config.signalPeriod || config.signalPeriod < 1) {
      errors.push('Período do signal do SMI deve ser positivo');
    }
    if (config.oversoldLevel < -100 || config.oversoldLevel > 100) {
      errors.push('Nível de sobrevenda do SMI deve estar entre -100 e 100');
    }
    if (config.overboughtLevel < -100 || config.overboughtLevel > 100) {
      errors.push('Nível de sobrecompra do SMI deve estar entre -100 e 100');
    }
    if (config.oversoldLevel >= config.overboughtLevel) {
      errors.push('Nível de sobrevenda do SMI deve ser menor que o de sobrecompra');
    }
  }

  // Validação de gestão de risco
  if (config.stopLoss < 0 || config.stopLoss > 50) {
    errors.push('Stop Loss deve estar entre 0 e 50%');
  }
  if (config.takeProfit < 0 || config.takeProfit > 100) {
    errors.push('Take Profit deve estar entre 0 e 100%');
  }

  // Validação do formato de exportação
  const validFormats = ['csv', 'json', 'both'];
  if (!config.exportFormat || !validFormats.includes(config.exportFormat)) {
    errors.push('Formato de exportação inválido. Deve ser: csv, json ou both');
  }

  // Log dos erros encontrados
  if (errors.length > 0) {
    logger.error('Erros de validação encontrados:', { errors });
    errors.forEach(error => console.error(`❌ ${error}`));
    return false;
  }

  logger.info('Configuração validada com sucesso', { config });
  return true;
}

/**
 * Valida se um símbolo de trading é válido
 * @param {string} symbol - Símbolo a ser validado
 * @returns {boolean} - True se o símbolo é válido
 */
function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return false;
  }
  
  // Padrão básico para símbolos da Binance (ex: BTCUSDT)
  const symbolPattern = /^[A-Z]{3,10}USDT$/;
  return symbolPattern.test(symbol);
}

/**
 * Valida dados de kline
 * @param {Array} klines - Array de dados de kline
 * @returns {boolean} - True se os dados são válidos
 */
function validateKlineData(klines) {
  if (!Array.isArray(klines) || klines.length === 0) {
    return false;
  }

  // Verificar se cada kline tem a estrutura esperada
  return klines.every(kline => {
    return Array.isArray(kline) && 
           kline.length >= 6 && 
           !isNaN(parseFloat(kline[1])) && // open
           !isNaN(parseFloat(kline[2])) && // high
           !isNaN(parseFloat(kline[3])) && // low
           !isNaN(parseFloat(kline[4])) && // close
           !isNaN(parseFloat(kline[5]));   // volume
  });
}

/**
 * Sanitiza entrada do usuário
 * @param {string} input - Input a ser sanitizado
 * @returns {string} - Input sanitizado
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input.trim().replace(/[^\w\s.-]/gi, '');
}

module.exports = {
  validateConfig,
  validateSymbol,
  validateKlineData,
  sanitizeInput
}; 