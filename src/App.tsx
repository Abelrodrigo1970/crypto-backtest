import { useState, useEffect } from 'react';
import { SymbolSelector } from './components/SymbolSelector';
import { StrategySelector } from './components/StrategySelector';
import { Chart } from './components/Chart';
import { BacktestResults } from './components/BacktestResults';
import { binanceService } from './services/binanceService';
import { strategies } from './strategies';
import { exportToPDF } from './utils/pdfExport';
import { Kline, Timeframe, BacktestResult } from './types';
import { StrategyParams } from './strategies/types';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [klines, setKlines] = useState<Kline[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('movingAverages');
  const [strategyParams, setStrategyParams] = useState<StrategyParams>(
    strategies.movingAverages.defaultParams
  );
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const symbols = await binanceService.getSymbols();
        setAvailableSymbols(symbols);
        if (symbols.length > 0) {
          setSelectedSymbol(symbols[0]);
        }
      } catch (error) {
        setError('Error fetching symbols');
        console.error(error);
      }
    };

    fetchSymbols();
  }, []);

  useEffect(() => {
    const fetchKlines = async () => {
      if (!selectedSymbol) return;

      setIsLoading(true);
      setError(null);

      try {
        const klines = await binanceService.getKlines(
          selectedSymbol,
          selectedTimeframe,
          startDate.getTime(),
          endDate.getTime()
        );
        setKlines(klines);
      } catch (error) {
        setError('Error fetching klines');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKlines();
  }, [selectedSymbol, selectedTimeframe, startDate, endDate]);

  const handleRunBacktest = () => {
    if (!selectedSymbol || klines.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const strategy = strategies[selectedStrategy];
      const strategyResults = strategy.run(klines, strategyParams);
      const backtestResult: BacktestResult = {
        ...strategyResults,
        capital: strategyParams.initialCapital,
        finalCapital: strategyResults.capitalHistory[strategyResults.capitalHistory.length - 1] || strategyParams.initialCapital,
        capitalHistory: strategyResults.capitalHistory.map((capital, index) => ({
          time: klines[index].openTime,
          capital
        }))
      };
      setResults(backtestResult);
    } catch (error) {
      setError('Error running backtest');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!results || !selectedSymbol) return;

    try {
      const pdfBytes = await exportToPDF(
        results,
        selectedSymbol,
        selectedTimeframe,
        strategies[selectedStrategy].name,
        startDate,
        endDate
      );

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backtest_${selectedSymbol}_${selectedTimeframe}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setError('Error exporting PDF');
      console.error(error);
    }
  };

  const handleStrategyParamsChange = (params: Record<string, number>) => {
    setStrategyParams(prev => ({
      ...prev,
      ...params
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-full">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg 
              className="w-12 h-12 text-yellow-500 mr-3 animate-bounce" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
              <path d="M19 14L20.09 17.26L24 18L20.09 18.74L19 22L17.91 18.74L14 18L17.91 17.26L19 14Z"/>
              <path d="M5 14L6.09 17.26L10 18L6.09 18.74L5 22L3.91 18.74L0 18L3.91 17.26L5 14Z"/>
            </svg>
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg px-4 py-2">
              <span className="text-yellow-800 font-bold text-lg">🚧 UNDER CONSTRUCTION 🚧</span>
            </div>
            <svg 
              className="w-12 h-12 text-yellow-500 ml-3 animate-bounce" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
              <path d="M19 14L20.09 17.26L24 18L20.09 18.74L19 22L17.91 18.74L14 18L17.91 17.26L19 14Z"/>
              <path d="M5 14L6.09 17.26L10 18L6.09 18.74L5 22L3.91 18.74L0 18L3.91 17.26L5 14Z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Crypto Backtest</h1>
          <p className="text-gray-600">Test your trading strategies with historical data</p>
          <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 inline-block">
            ⚠️ This application is currently under development. Some features may not work as expected.
          </div>
        </header>

        {/* Top Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Symbol Selection */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl">
            <SymbolSelector
              selectedSymbol={selectedSymbol}
              selectedTimeframe={selectedTimeframe}
              startDate={startDate}
              endDate={endDate}
              onSymbolChange={setSelectedSymbol}
              onTimeframeChange={setSelectedTimeframe}
              onDateRangeChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              availableSymbols={availableSymbols}
            />
          </div>

          {/* Strategy Selection */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl">
            <StrategySelector
              selectedStrategy={selectedStrategy}
              onStrategyChange={setSelectedStrategy}
              onParamsChange={handleStrategyParamsChange}
            />
          </div>

          {/* Backtest Parameters */}
          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Parameters</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Capital
                </label>
                <input
                  type="number"
                  value={strategyParams.initialCapital}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      initialCapital: parseFloat(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trade Percentage
                </label>
                <input
                  type="number"
                  value={strategyParams.tradePercentage}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      tradePercentage: parseFloat(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleRunBacktest}
                disabled={isLoading || !selectedSymbol || klines.length === 0}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transform transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running...
                  </span>
                ) : (
                  'Run Backtest'
                )}
              </button>
              {results && (
                <button
                  onClick={handleExportPDF}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105"
                >
                  Export PDF
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chart Section - Full Width */}
        {klines.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Price Chart</h2>
              <Chart
                klines={klines}
                trades={results?.trades || []}
                shortPeriod={strategyParams.shortPeriod || 20}
                longPeriod={strategyParams.longPeriod || 50}
              />
            </div>
          </div>
        )}

        {/* Results Section - Full Width */}
        {results && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Backtest Results</h2>
              <BacktestResults results={results} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
