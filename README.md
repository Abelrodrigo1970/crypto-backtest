# Backtest React - Plataforma de Análise Técnica e Backtesting

Uma aplicação React moderna para análise técnica e backtesting de estratégias de trading, desenvolvida com TypeScript e Vite. Esta plataforma permite testar diferentes estratégias de trading em dados históricos e visualizar os resultados através de gráficos interativos.

## 🎯 Funcionalidades Principais

- **Análise Técnica**: Implementação de indicadores técnicos populares:
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - Médias Móveis
  - Estocástico

- **Backtesting**: Teste suas estratégias com:
  - Dados históricos
  - Múltiplos timeframes
  - Diferentes ativos
  - Análise de performance

- **Visualização**: Gráficos interativos com:
  - Candlesticks
  - Indicadores técnicos
  - Volume
  - Marcadores de entrada/saída

- **Relatórios**: Geração de relatórios detalhados incluindo:
  - Métricas de performance
  - Gráficos de equity
  - Estatísticas de trades
  - Exportação em PDF

## 🚀 Tecnologias

### Frontend
- [React](https://reactjs.org/) - Biblioteca JavaScript para construção de interfaces
- [TypeScript](https://www.typescriptlang.org/) - Superset JavaScript com tipagem estática
- [Vite](https://vitejs.dev/) - Build tool e servidor de desenvolvimento
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário

### Visualização de Dados
- [Recharts](https://recharts.org/) - Biblioteca de gráficos
- [Lightweight Charts](https://www.tradingview.com/lightweight-charts/) - Biblioteca para gráficos financeiros

### Utilitários
- [Axios](https://axios-http.com/) - Cliente HTTP
- [Date-fns](https://date-fns.org/) - Manipulação de datas
- [PDF-lib](https://pdf-lib.js.org/) - Manipulação de PDFs

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Conhecimento básico de análise técnica e trading

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/backtest_react.git
cd backtest_react
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

O aplicativo estará disponível em `http://localhost:5173`

## 🛠️ Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila o projeto para produção
- `npm run lint` - Executa o linter
- `npm run preview` - Visualiza a versão de produção localmente

## 💡 Como Usar

1. **Selecionar Ativo**
   - Escolha o símbolo do ativo que deseja analisar
   - Selecione o timeframe desejado

2. **Configurar Estratégia**
   - Escolha uma das estratégias disponíveis
   - Ajuste os parâmetros conforme necessário
   - Configure as regras de entrada e saída

3. **Executar Backtest**
   - Defina o período de teste
   - Execute o backtest
   - Analise os resultados

4. **Analisar Resultados**
   - Visualize o gráfico com as entradas/saídas
   - Verifique as métricas de performance
   - Exporte o relatório em PDF

## 🤝 Contribuindo

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Faça o Commit das suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Faça o Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Guia de Contribuição

- Siga as convenções de código existentes
- Adicione testes para novas funcionalidades
- Atualize a documentação quando necessário
- Use commits semânticos

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## ⚠️ Aviso Legal

Este software é apenas para fins educacionais e de pesquisa. Não deve ser usado para tomar decisões de investimento reais. O autor não se responsabiliza por quaisquer perdas financeiras resultantes do uso deste software.

## 📫 Contato

Abel Oliveira  - abelrodrigo101@gmail.com

Link do Projeto: [https://github.com/abelrodrigo1970/backtest_react](https://github.com/abelrodrigo1970/backtest_react)

## 🙏 Agradecimentos

- TradingView pela biblioteca Lightweight Charts
- Comunidade React e TypeScript
- Todos os contribuidores do projeto


