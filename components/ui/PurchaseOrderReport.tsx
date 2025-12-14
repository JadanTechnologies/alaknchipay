import React from 'react';
import { PurchaseOrder } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PurchaseOrderReportProps {
  purchaseOrder: PurchaseOrder;
  currency: string;
  storeName?: string;
}

export const PurchaseOrderReport: React.FC<PurchaseOrderReportProps> = ({
  purchaseOrder,
  currency,
  storeName = 'AlkanchiPay Store'
}) => {
  const generatePDF = () => {
    // Sanitize currency symbol for PDF (replace Naira symbol with N as standard fonts don't support it)
    const safeCurrency = currency === '₦' ? 'N' : currency;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Colors - as tuples for jsPDF
    const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
    const darkColor: [number, number, number] = [31, 41, 55]; // Dark gray
    const lightGray: [number, number, number] = [243, 244, 246]; // Light gray
    
    let yPosition = 15;

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER REPORT', 15, 18);
    
    // Store Info
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Store: ${storeName}`, 15, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 42);
    doc.text(`Order Date: ${new Date(purchaseOrder.date).toLocaleDateString()}`, 15, 49);
    doc.text(`Order ID: ${purchaseOrder.id}`, 15, 56);
    doc.text(`Status: ${purchaseOrder.status}`, 15, 63);
    doc.text(`Created By: ${purchaseOrder.createdByName}`, 15, 70);

    yPosition = 78;

    // Items Table
    const itemsData = purchaseOrder.items.map((item) => [
      item.serialNumber,
      item.itemName,
      item.modelNumber,
      item.quantity.toString(),
      `${safeCurrency}${item.costPrice.toFixed(2)}`,
      `${safeCurrency}${item.totalCostPrice.toFixed(2)}`,
      `${safeCurrency}${item.shippingExpense.toFixed(2)}`,
      `${safeCurrency}${item.storeCostPrice.toFixed(2)}`,
      `${safeCurrency}${item.storeSellingPrice.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['S/N', 'Item Name', 'Model', 'Qty', 'Unit Cost', 'Total Cost', 'Shipping', 'Store Cost', 'Store Price']],
      body: itemsData,
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        cellPadding: 6
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 5
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { halign: 'left' },
        2: { halign: 'center' },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 25 },
        6: { halign: 'right', cellWidth: 22 },
        7: { halign: 'right', cellWidth: 22 },
        8: { halign: 'right', cellWidth: 25 }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Summary Section
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(15, yPosition, pageWidth - 30, 60, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

    const summaryY = yPosition + 8;
    const summaryX = pageWidth - 75;

    // Calculate totals
    const totalSupplierCost = purchaseOrder.items.reduce((sum, item) => sum + item.totalCostPrice, 0);
    const totalShipping = purchaseOrder.items.reduce((sum, item) => sum + item.shippingExpense, 0);
    const totalStoreCost = purchaseOrder.items.reduce((sum, item) => sum + (item.storeCostPrice * item.quantity), 0);
    const totalStoreSellingPrice = purchaseOrder.items.reduce((sum, item) => sum + (item.storeSellingPrice * item.quantity), 0);
    const potentialProfit = totalStoreSellingPrice - totalStoreCost;

    // Summary lines
    const summaryLines = [
      [`Subtotal (Supplier Cost):`, `${safeCurrency}${totalSupplierCost.toFixed(2)}`],
      [`Total Shipping Expense:`, `${safeCurrency}${totalShipping.toFixed(2)}`],
      [`TOTAL COST (All Items + Shipping):`, `${safeCurrency}${purchaseOrder.totalCost.toFixed(2)}`],
      [`TOTAL STORE COST (All Items):`, `${safeCurrency}${totalStoreCost.toFixed(2)}`],
      [`TOTAL STORE SELLING PRICE (All Items):`, `${safeCurrency}${totalStoreSellingPrice.toFixed(2)}`],
      [`POTENTIAL PROFIT (Selling - Cost):`, `${safeCurrency}${potentialProfit.toFixed(2)}`],
    ];

    let currentY = summaryY;
    summaryLines.forEach((line, index) => {
      const isTotalLine = index >= 2;
      if (isTotalLine) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      }
      
      doc.text(line[0], 20, currentY);
      doc.text(line[1], summaryX + 50, currentY, { align: 'right' });
      currentY += 8;
    });

    // Footer message
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.setFont('helvetica', 'italic');
    doc.text('This is an automatically generated Purchase Order Report', 15, pageHeight - 15);

    return doc;
  };

  const handlePrint = () => {
    const doc = generatePDF();
    const pdfDataUri = doc.output('dataurlstring');
    const iframe = document.createElement('iframe');
    iframe.src = pdfDataUri;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 250);
    };
  };

  const handleDownloadPDF = () => {
    const doc = generatePDF();
    const fileName = `PurchaseOrder_${purchaseOrder.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-semibold transition"
        title="Print Purchase Order"
      >
        🖨️ Print
      </button>
      <button
        onClick={handleDownloadPDF}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-sm font-semibold transition"
        title="Download as PDF"
      >
        📥 PDF
      </button>
    </div>
  );
};
