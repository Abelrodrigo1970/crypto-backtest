import { PDFDocument, rgb } from 'pdf-lib';
import { BacktestResult } from '../types';

export const exportToPDF = async (
  results: BacktestResult,
  symbol: string,
  timeframe: string,
  strategyName: string,
  startDate: Date,
  endDate: Date
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  const fontSize = 12;

  // Add title
  page.drawText('Backtest Results', {
    x: 50,
    y: height - 50,
    size: 20,
    color: rgb(0, 0, 0),
  });

  // Add basic information
  const info = [
    `Symbol: ${symbol}`,
    `Timeframe: ${timeframe}`,
    `Strategy: ${strategyName}`,
    `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    `Initial Capital: $${results.capital.toFixed(2)}`,
    `Final Capital: $${results.finalCapital.toFixed(2)}`,
    `Total Return: ${((results.finalCapital - results.capital) / results.capital * 100).toFixed(2)}%`,
    `Number of Trades: ${results.trades.length}`,
    `Win Rate: ${(results.winRate * 100).toFixed(2)}%`,
  ];

  info.forEach((text, index) => {
    page.drawText(text, {
      x: 50,
      y: height - 100 - (index * 20),
      size: fontSize,
      color: rgb(0, 0, 0),
    });
  });

  return pdfDoc.save();
}; 