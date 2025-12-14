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
    const safeCurrency = currency === '₦' ? 'NGN ' : currency;
    
    const doc = new jsPDF({
      orientation: 'landscape', // Use landscape for better column spacing
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // Professional color palette
    const primaryColor: [number, number, number] = [37, 99, 235]; // Professional blue
    const secondaryColor: [number, number, number] = [79, 70, 229]; // Indigo
    const darkColor: [number, number, number] = [17, 24, 39]; // Almost black
    const lightGray: [number, number, number] = [249, 250, 251]; // Very light gray
    const borderColor: [number, number, number] = [229, 231, 235]; // Border gray
    const successColor: [number, number, number] = [34, 197, 94]; // Green for profit
    
    let yPosition = margin;

    // ============ HEADER SECTION ============
    // Gradient-style header with company branding
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Add subtle accent line
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 32, pageWidth, 3, 'F');
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(storeName, margin, 15);
    
    // Document title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('PURCHASE ORDER REPORT', margin, 25);
    
    // Order ID on the right
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const orderIdText = `Order #${purchaseOrder.id.substring(0, 8).toUpperCase()}`;
    doc.text(orderIdText, pageWidth - margin, 15, { align: 'right' });
    
    // Status badge on the right
    doc.setFontSize(10);
    const statusText = purchaseOrder.status.toUpperCase();
    const statusWidth = doc.getTextWidth(statusText) + 8;
    const statusX = pageWidth - margin - statusWidth;
    
    // Status background
    const statusColor = purchaseOrder.status === 'RECEIVED' ? successColor : 
                       purchaseOrder.status === 'PENDING' ? [234, 179, 8] : 
                       [239, 68, 68];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(statusX, 20, statusWidth, 7, 2, 2, 'F');
    doc.text(statusText, statusX + 4, 25);

    yPosition = 45;

    // ============ ORDER INFORMATION SECTION ============
    // Info box with border
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 2, 2, 'FD');
    
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const infoY = yPosition + 7;
    const col1X = margin + 5;
    const col2X = margin + 85;
    const col3X = margin + 165;
    
    // Column 1
    doc.setFont('helvetica', 'bold');
    doc.text('Order Date:', col1X, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(purchaseOrder.date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), col1X, infoY + 6);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Report Generated:', col1X, infoY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), col1X, infoY + 18);
    
    // Column 2
    doc.setFont('helvetica', 'bold');
    doc.text('Created By:', col2X, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(purchaseOrder.createdByName, col2X, infoY + 6);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Items:', col2X, infoY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${purchaseOrder.items.length} items`, col2X, infoY + 18);
    
    // Column 3
    doc.setFont('helvetica', 'bold');
    doc.text('Order Status:', col3X, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(purchaseOrder.status, col3X, infoY + 6);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Quantity:', col3X, infoY + 12);
    doc.setFont('helvetica', 'normal');
    const totalQty = purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    doc.text(`${totalQty} units`, col3X, infoY + 18);

    yPosition += 32;

    // ============ ITEMS TABLE ============
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('Order Items', margin, yPosition);
    yPosition += 7;

    const itemsData = purchaseOrder.items.map((item, index) => [
      (index + 1).toString(),
      item.itemName,
      item.modelNumber || 'N/A',
      item.quantity.toString(),
      `${safeCurrency}${item.costPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${safeCurrency}${item.totalCostPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${safeCurrency}${item.shippingExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${safeCurrency}${item.storeCostPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${safeCurrency}${item.storeSellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [[
        '#', 
        'Item Name', 
        'Model', 
        'Qty', 
        'Unit Cost', 
        'Total Cost', 
        'Shipping', 
        'Store Cost', 
        'Selling Price'
      ]],
      body: itemsData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        valign: 'middle',
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      bodyStyles: {
        fontSize: 8.5,
        cellPadding: 3.5,
        textColor: darkColor,
        lineWidth: 0.1,
        lineColor: borderColor,
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 'auto', minCellWidth: 40 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
        6: { halign: 'right', cellWidth: 25 },
        7: { halign: 'right', cellWidth: 28 },
        8: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        // Add page numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${currentPage} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // ============ FINANCIAL SUMMARY SECTION ============
    // Calculate totals
    const totalSupplierCost = purchaseOrder.items.reduce((sum, item) => sum + item.totalCostPrice, 0);
    const totalShipping = purchaseOrder.items.reduce((sum, item) => sum + item.shippingExpense, 0);
    const totalStoreCost = purchaseOrder.items.reduce((sum, item) => sum + (item.storeCostPrice * item.quantity), 0);
    const totalStoreSellingPrice = purchaseOrder.items.reduce((sum, item) => sum + (item.storeSellingPrice * item.quantity), 0);
    const potentialProfit = totalStoreSellingPrice - totalStoreCost;
    const profitMargin = totalStoreSellingPrice > 0 ? ((potentialProfit / totalStoreSellingPrice) * 100) : 0;

    // Summary box
    const summaryBoxHeight = 55;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, summaryBoxHeight, 2, 2, 'FD');
    
    // Summary title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('FINANCIAL SUMMARY', margin + 5, yPosition + 7);
    
    // Draw a divider line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin + 5, yPosition + 9, pageWidth - margin - 5, yPosition + 9);

    const summaryStartY = yPosition + 15;
    const labelX = margin + 5;
    const valueX = pageWidth - margin - 5;

    const summaryItems = [
      { label: 'Subtotal (Supplier Cost):', value: totalSupplierCost, bold: false },
      { label: 'Total Shipping Expense:', value: totalShipping, bold: false },
      { label: 'TOTAL PURCHASE COST:', value: purchaseOrder.totalCost, bold: true, color: primaryColor },
      { label: 'Total Store Cost (with shipping):', value: totalStoreCost, bold: false },
      { label: 'Total Selling Price:', value: totalStoreSellingPrice, bold: true, color: secondaryColor },
      { label: 'POTENTIAL PROFIT:', value: potentialProfit, bold: true, color: successColor }
    ];

    let currentY = summaryStartY;
    summaryItems.forEach((item, index) => {
      if (item.bold) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        if (item.color) {
          doc.setTextColor(item.color[0], item.color[1], item.color[2]);
        }
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      }
      
      doc.text(item.label, labelX, currentY);
      doc.text(
        `${safeCurrency}${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        valueX,
        currentY,
        { align: 'right' }
      );
      currentY += 7;
    });

    // Profit margin indicator
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Profit Margin: ${profitMargin.toFixed(2)}%`,
      valueX,
      currentY,
      { align: 'right' }
    );

    // ============ FOOTER ============
    const footerY = pageHeight - 12;
    
    // Footer background
    doc.setFillColor(247, 247, 247);
    doc.rect(0, footerY - 5, pageWidth, 20, 'F');
    
    // Footer text
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'This is an automatically generated Purchase Order Report from AlkanchiPay System',
      margin,
      footerY
    );
    
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated on: ${new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      pageWidth - margin,
      footerY,
      { align: 'right' }
    );

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
    const fileName = `PurchaseOrder_${purchaseOrder.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
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