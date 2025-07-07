#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const colors = require('colors');
const logger = require('./src/utils/logger');
const BacktestEngine = require('./src/backtest/engine');
const { validateConfig } = require('./src/utils/validation');

// Configuração do programa
program
  .name('crypto-backtest')
  .description('Aplicação para backtesting de estratégias de trading em criptomoedas')
  .version('1.0.0');

// Comando principal para executar backtest
program
  .command('run')
  .description('Executar backtest com configurações interativas')
  .action(async () => {
    try {
      console.log(colors.cyan('🚀 Bem-vindo ao Crypto Backtest App!\n'));
      
      const config = await collectUserInputs();
      
      if (!validateConfig(config)) {
        logger.error('Configuração inválida fornecida');
        process.exit(1);
      }
      
      const engine = new BacktestEngine(config);
      await engine.run();
      
    } catch (error) {
      logger.error('Erro durante execução do backtest:', error);
      process.exit(1);
    }
  });

// Comando para listar pares disponíveis
program
  .command('list-pairs')
  .description('Listar todos os pares de futuros disponíveis na Binance')
  .action(async () => {
    try {
      const DataCollector = require('./src/data/collector');
      const collector = new DataCollector();
      const pairs = await collector.getFuturesPairs();
      
      console.log(colors.green(`\n📊 Pares de Futuros Disponíveis (${pairs.length} total):\n`));
      pairs.forEach((pair, index) => {
        console.log(`${index + 1}. ${pair.symbol} - ${pair.baseAsset}/${pair.quoteAsset}`);
      });
      
    } catch (error) {
      logger.error('Erro ao obter pares:', error);
      process.exit(1);
    }
  });

// Função para coletar inputs do usuário
async function collectUserInputs() {
  const questions = [
    {
      type: 'list',
      name: 'timeframe',
      message: 'Selecione o timeframe:',
      choices: [
        { name: '15 minutos', value: '15m' },
        { name: '1 hora', value: '1h' },
        { name: '4 horas', value: '4h' }
      ]
    },
    {
      type: 'list',
      name: 'strategy',
      message: 'Selecione a estratégia:',
      choices: [
        { name: 'Cruzamento de Médias Móveis', value: 'ma_crossover' },
        { name: 'RSI (Índice de Força Relativa)', value: 'rsi' },
        { name: 'MACD (Convergência/Divergência)', value: 'macd' }
      ]
    },
    {
      type: 'input',
      name: 'backtestDays',
      message: 'Período de backtest (dias):',
      default: '30',
      validate: (input) => {
        const days = parseInt(input);
        return days > 0 && days <= 365 ? true : 'Digite um número entre 1 e 365';
      }
    }
  ];

  let answers = await inquirer.prompt(questions);

  // Perguntas específicas para cada estratégia
  if (answers.strategy === 'ma_crossover') {
    const maQuestions = [
      {
        type: 'input',
        name: 'fastPeriod',
        message: 'Período da média móvel rápida:',
        default: '10',
        validate: (input) => parseInt(input) > 0 ? true : 'Digite um número positivo'
      },
      {
        type: 'input',
        name: 'slowPeriod',
        message: 'Período da média móvel lenta:',
        default: '30',
        validate: (input) => parseInt(input) > 0 ? true : 'Digite um número positivo'
      }
    ];
    
    const maAnswers = await inquirer.prompt(maQuestions);
    answers = { ...answers, ...maAnswers };
  } else if (answers.strategy === 'rsi') {
    const rsiQuestions = [
      {
        type: 'input',
        name: 'rsiPeriod',
        message: 'Período do RSI:',
        default: '14',
        validate: (input) => parseInt(input) > 0 ? true : 'Digite um número positivo'
      },
      {
        type: 'input',
        name: 'oversoldLevel',
        message: 'Nível de sobrevenda (RSI):',
        default: '30',
        validate: (input) => {
          const val = parseFloat(input);
          return val >= 0 && val <= 100 ? true : 'Digite um valor entre 0 e 100';
        }
      },
      {
        type: 'input',
        name: 'overboughtLevel',
        message: 'Nível de sobrecompra (RSI):',
        default: '70',
        validate: (input) => {
          const val = parseFloat(input);
          return val >= 0 && val <= 100 ? true : 'Digite um valor entre 0 e 100';
        }
      }
    ];
    
    const rsiAnswers = await inquirer.prompt(rsiQuestions);
    answers = { ...answers, ...rsiAnswers };
  } else if (answers.strategy === 'macd') {
    const macdQuestions = [
      {
        type: 'input',
        name: 'fastPeriod',
        message: 'Período rápido (EMA):',
        default: '12',
        validate: (input) => parseInt(input) > 0 ? true : 'Digite um número positivo'
      },
      {
        type: 'input',
        name: 'slowPeriod',
        message: 'Período lento (EMA):',
        default: '26',
        validate: (input) => parseInt(input) > 0 ? true : 'Digite um número positivo'
      },
      {
        type: 'input',
        name: 'signalPeriod',
        message: 'Período do signal:',
        default: '9',
        validate: (input) => parseInt(input) > 0 ? true : 'Digite um número positivo'
      }
    ];
    
    const macdAnswers = await inquirer.prompt(macdQuestions);
    answers = { ...answers, ...macdAnswers };
  }

  // Perguntas sobre gestão de risco
  const riskQuestions = [
    {
      type: 'input',
      name: 'stopLoss',
      message: 'Stop Loss (% - opcional):',
      default: '2',
      validate: (input) => {
        if (input === '' || input === '0') return true;
        const val = parseFloat(input);
        return val > 0 && val <= 50 ? true : 'Digite um valor entre 0 e 50';
      }
    },
    {
      type: 'input',
      name: 'takeProfit',
      message: 'Take Profit (% - opcional):',
      default: '4',
      validate: (input) => {
        if (input === '' || input === '0') return true;
        const val = parseFloat(input);
        return val > 0 && val <= 100 ? true : 'Digite um valor entre 0 e 100';
      }
    },
    {
      type: 'list',
      name: 'exportFormat',
      message: 'Formato de exportação dos resultados:',
      choices: [
        { name: 'CSV', value: 'csv' },
        { name: 'JSON', value: 'json' },
        { name: 'Ambos', value: 'both' }
      ]
    }
  ];

  const riskAnswers = await inquirer.prompt(riskQuestions);
  answers = { ...answers, ...riskAnswers };

  // Conversão de tipos
  answers.backtestDays = parseInt(answers.backtestDays);
  answers.stopLoss = parseFloat(answers.stopLoss) || 0;
  answers.takeProfit = parseFloat(answers.takeProfit) || 0;

  if (answers.fastPeriod) answers.fastPeriod = parseInt(answers.fastPeriod);
  if (answers.slowPeriod) answers.slowPeriod = parseInt(answers.slowPeriod);
  if (answers.rsiPeriod) answers.rsiPeriod = parseInt(answers.rsiPeriod);
  if (answers.oversoldLevel) answers.oversoldLevel = parseFloat(answers.oversoldLevel);
  if (answers.overboughtLevel) answers.overboughtLevel = parseFloat(answers.overboughtLevel);

  return answers;
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Executar o programa
if (require.main === module) {
  program.parse(process.argv);
} 