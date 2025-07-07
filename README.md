# 📊 Crypto Backtest - Sistema de Backtesting para Criptomoedas

Um sistema completo de backtesting para estratégias de trading de criptomoedas usando dados da Binance Futures, com interface web moderna e análise detalhada de resultados.

## 🚀 Funcionalidades

### 📈 Estratégias Implementadas
- **MA Crossover (Cruzamento de Médias Móveis)**: Estratégia baseada no cruzamento de médias móveis rápidas e lentas
- **SMI (Stochastic Momentum Index)**: Indicador de momentum estocástico para identificar reversões de tendência

### 🎯 Características Principais
- **Interface Web Moderna**: Dashboard intuitivo com gráficos interativos
- **Dados em Tempo Real**: Coleta automática de dados históricos da Binance Futures
- **Análise Detalhada**: Métricas completas de performance e análise de trades
- **Múltiplos Timeframes**: Suporte para 15m, 1h, 2h, 4h
- **Gestão de Risco**: Stop Loss e Take Profit configuráveis
- **Relatórios Completos**: Exportação de resultados e trades detalhados

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Technical Indicators** - Biblioteca de indicadores técnicos
- **Axios** - Cliente HTTP para APIs

### Frontend
- **HTML5/CSS3** - Interface responsiva
- **JavaScript (ES6+)** - Lógica do cliente
- **Chart.js** - Gráficos interativos
- **Bootstrap** - Framework CSS

### APIs
- **Binance Futures API** - Dados históricos de criptomoedas

## 📦 Instalação

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn

### Passos de Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/crypto-backtest.git
cd crypto-backtest
```

2. **Instale as dependências**
```bash
npm install
```

3. **Inicie o servidor**
```bash
npm start
```

4. **Acesse a aplicação**
```
http://localhost:3000
```

## 🎮 Como Usar

### 1. Configuração Inicial
- Acesse `http://localhost:3000`
- Configure os parâmetros do backtest:
  - **Estratégia**: Escolha entre MA Crossover ou SMI
  - **Timeframe**: 15m, 1h, 2h, 4h
  - **Período**: Número de dias para o backtest
  - **Capital Inicial**: Valor inicial para simulação

### 2. Parâmetros das Estratégias

#### MA Crossover
- **Período Rápido**: Média móvel rápida (padrão: 10)
- **Período Lento**: Média móvel lenta (padrão: 30)

#### SMI (Stochastic Momentum Index)
- **Período SMI**: Período do indicador (padrão: 14)
- **Período Sinal**: Período da linha de sinal (padrão: 3)
- **Nível Sobrevenda**: Limite inferior (padrão: -40)
- **Nível Sobrecompra**: Limite superior (padrão: 40)

### 3. Execução do Backtest
- Clique em "Executar Backtest"
- Aguarde o processamento dos dados
- Visualize os resultados na tabela

### 4. Análise de Resultados
- **Resumo Geral**: Métricas agregadas de todos os símbolos
- **Trades Detalhados**: Clique em qualquer símbolo para ver trades individuais
- **Gráficos**: Visualização interativa dos resultados

## 📊 Métricas Disponíveis

### Resumo Geral
- **Total de Símbolos**: Número de criptomoedas analisadas
- **Retorno Médio**: Retorno médio de todas as estratégias
- **Símbolos Lucrativos**: Quantidade de símbolos com resultado positivo

### Por Símbolo
- **Total de Trades**: Número total de operações
- **Trades Vencedores/Perdedores**: Distribuição de resultados
- **Win Rate**: Percentual de trades lucrativos
- **Retorno Total**: Retorno percentual total
- **Taxas Totais**: Custos de transação
- **Trades Detalhados**: Lista completa de operações

## 🔧 Estrutura do Projeto

```
crypto-backtest/
├── src/
│   ├── backtest/
│   │   └── engine.js          # Motor principal do backtest
│   ├── data/
│   │   └── collector.js       # Coleta de dados da Binance
│   ├── metrics/
│   │   └── calculator.js      # Cálculo de métricas
│   ├── strategies/
│   │   ├── ma_crossover.js    # Estratégia MA Crossover
│   │   └── smi.js            # Estratégia SMI
│   └── utils/
│       ├── exporter.js        # Exportação de dados
│       ├── logger.js          # Sistema de logs
│       └── validation.js      # Validação de dados
├── public/
│   ├── css/
│   │   └── style.css          # Estilos da interface
│   ├── js/
│   │   └── main.js           # JavaScript do frontend
│   └── index.html            # Interface principal
├── logs/                     # Arquivos de log
├── results/                  # Resultados exportados
├── server.js                 # Servidor Express
├── package.json              # Dependências e scripts
└── README.md                 # Este arquivo
```

## 📈 Exemplos de Uso

### Backtest Rápido
```bash
# Executar backtest via CLI
npm run cli
```

### Desenvolvimento
```bash
# Modo desenvolvimento com auto-reload
npm run dev
```

## 🔍 Logs e Debugging

Os logs são salvos em:
- `logs/app.log` - Logs gerais da aplicação
- `logs/error.log` - Logs de erro

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## ⚠️ Disclaimer

Este software é apenas para fins educacionais e de análise. Não é uma recomendação de investimento. Trading de criptomoedas envolve riscos significativos. Sempre faça sua própria pesquisa antes de investir.

## 📞 Suporte

Para dúvidas ou sugestões:
- Abra uma issue no GitHub
- Entre em contato através do email: seu-email@exemplo.com

---

**Desenvolvido com ❤️ para a comunidade de trading de criptomoedas**
