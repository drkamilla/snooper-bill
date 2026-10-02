import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExecutionReceipt } from '../types';
import { formatCurrencyAmount } from './tableParser';

const toSafeAscii = (text: string, fallback: string): string => {
  const clean = String(text ?? '').replace(/[^\x20-\x7E]/g, '').trim();
  return clean.length > 0 ? clean : fallback;
};

export function generateSettlementPdf(receipt: ExecutionReceipt) {
  const doc = new jsPDF();

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SNOOPER BILL — PAYMENT SETTLEMENT RECEIPT', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Date & Time: ${receipt.timestamp}`, 14, 25);

  let currentY = 32;

  doc.setFontSize(8);
  if (receipt.usdcTxHash) {
    doc.text(`Tx USDC: ${receipt.usdcTxHash}`, 14, currentY);
    currentY += 5;
  }
  if (receipt.eurcTxHash) {
    doc.text(`Tx EURC: ${receipt.eurcTxHash}`, 14, currentY);
    currentY += 5;
  }
  if (!receipt.usdcTxHash && !receipt.eurcTxHash && receipt.txHash) {
    doc.text(`Tx: ${receipt.txHash}`, 14, currentY);
    currentY += 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);

  if (receipt.totalUsdcPaid > 0) {
    doc.text(`Total USDC: $${formatCurrencyAmount(receipt.totalUsdcPaid)} USDC`, 14, currentY + 2);
    currentY += 6;
  }
  if (receipt.totalEurcPaid > 0) {
    doc.text(`Total EURC: ${formatCurrencyAmount(receipt.totalEurcPaid)} EURC`, 14, currentY + 2);
    currentY += 6;
  }
  if (receipt.wasConverted) {
    doc.setTextColor(37, 99, 235);
    doc.text('FX Status: EURC auto-converted to USDC via Live Oracle Feed', 14, currentY + 2);
    currentY += 6;
  }
  if (receipt.gasPaidUsdc > 0) {
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.text(`Network Gas: $${receipt.gasPaidUsdc.toFixed(6)} USDC (Arc Native)`, 14, currentY + 2);
    currentY += 6;
  }

  const eurcTotal = receipt.records
    .filter((r) => (r.token || '').toUpperCase() === 'EURC')
    .reduce((acc, r) => acc + r.amount, 0);
  const usdcOriginalTotal = receipt.records
    .filter((r) => (r.token || '').toUpperCase() !== 'EURC')
    .reduce((acc, r) => acc + r.amount, 0);
  const convertedUsdcTotal = receipt.totalUsdcPaid - usdcOriginalTotal;
  const conversionRate = eurcTotal > 0 && convertedUsdcTotal > 0 ? convertedUsdcTotal / eurcTotal : 0;

  const tableData = receipt.records.map((r) => {
    const isEur = (r.token || '').toUpperCase() === 'EURC';
    let amountStr = `${formatCurrencyAmount(r.amount)} ${r.token || 'USDC'}`;

    if (receipt.wasConverted && isEur && conversionRate > 0) {
      const convertedAmt = Number((r.amount * conversionRate).toFixed(6));
      amountStr = `${formatCurrencyAmount(convertedAmt)} USDC (equiv. ${formatCurrencyAmount(r.amount)} EURC)`;
    }

    return [
      r.rowNumber.toString(),
      toSafeAscii(r.recipientName, `Recipient #${r.rowNumber}`),
      toSafeAscii(r.rawAmountString || '—', '—'),
      toSafeAscii(r.invoiceRef || '—', `INV-${r.rowNumber}`),
      amountStr,
      r.walletAddress,
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['#', 'Recipient', 'Description', 'Invoice', 'Amount', 'Wallet Address']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      lineWidth: 0.1,
      lineColor: [209, 213, 219],
    },
    bodyStyles: {
      textColor: [31, 41, 55],
      lineWidth: 0.1,
      lineColor: [229, 231, 235],
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
  });

  const fileNameHash = (receipt.txHash || receipt.usdcTxHash || 'receipt').slice(0, 8);
  doc.save(`SnooperBill_Settlement_${fileNameHash}.pdf`);
}