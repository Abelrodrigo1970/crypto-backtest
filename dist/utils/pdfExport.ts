// src/utils/pdfExport.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { BacktestResult } from '../types';
import { format } from 'date-fns';

export async function exportToPDF(
  results: BacktestResult,
  symbol: string,
  timeframe: string,
  strategy: string,
  startDate: Date,
  endDate: Date
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Title
  page.drawText('Backtest Results', {
    x: 50,
    y: height - 50,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0)
  });

  // Strategy Information
  const strategyInfo = [
    `Symbol: ${symbol}`,
    `Timeframe: ${timeframe}`,
    `Strategy: ${strategy}`,
    `Period: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`
  ];

  strategyInfo.forEach((info, index) => {
    page.drawText(info, {
      x: 50,
      y: height - 100 - (index * 20),
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });
  });

  // Performance Metrics
  const metrics = [
    `Total Profit: ${results.totalProfit.toFixed(2)}`,
    `Win Rate: ${(results.winRate * 100).toFixed(2)}%`,
    `Max Drawdown: ${results.maxDrawdown.toFixed(2)}%`
  ];

  metrics.forEach((metric, index) => {
    page.drawText(metric, {
      x: 50,
      y: height - 200 - (index * 20),
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });
  });

  // Trade History
  page.drawText('Trade History', {
    x: 50,
    y: height - 300,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0)
  });

  const headers = ['Entry Time', 'Exit Time', 'Type', 'Entry Price', 'Exit Price', 'Profit'];
  const headerY = height - 330;
  const cellWidth = 80;
  const startX = 50;

  // Draw headers
  headers.forEach((header, index) => {
    page.drawText(header, {
      x: startX + (index * cellWidth),
      y: headerY,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
  });

  // Draw trade data
  results.trades.forEach((trade, rowIndex) => {
    const rowY = headerY - 20 - (rowIndex * 20);
    const rowData = [
      format(new Date(trade.entryTime), 'dd/MM/yyyy HH:mm'),
      format(new Date(trade.exitTime), 'dd/MM/yyyy HH:mm'),
      trade.type,
      trade.entryPrice.toFixed(4),
      trade.exitPrice.toFixed(4),
      trade.profit.toFixed(2)
    ];

    rowData.forEach((data, colIndex) => {
      page.drawText(data, {
        x: startX + (colIndex * cellWidth),
        y: rowY,
        size: 10,
        font: font,
        color: rgb(0, 0, 0)
      });
    });
  });

  return pdfDoc.save();
}