# 🖨️ QUICK GUIDE - PRINT & PDF BUTTONS

## Where to Find the Print and PDF Buttons

### Location in Application:

```
Super Admin Dashboard
  ↓
Sidebar → "Purchases" (🛍️ icon)
  ↓
Purchase Orders Table
  ↓
Each Row has Actions Column with Buttons:
```

---

## Visual Layout

### Purchase Orders Table:

```
┌────────┬──────────┬──────────┬────────┬────────┬────────┬──────────┐
│ Date   │ Items    │Item Cost │Shipping│ Total  │ Status │ Actions  │
├────────┼──────────┼──────────┼────────┼────────┼────────┼──────────┤
│12/14   │2 items   │$550.00   │$300.00 │$850.00 │PENDING │ [🖨️] [📥]│
│        │(150 qty) │          │        │        │        │ [⚙️] [🗑️]│
├────────┼──────────┼──────────┼────────┼────────┼────────┼──────────┤
│12/13   │1 item    │$200.00   │$100.00 │$300.00 │RECEIVED│Convert  │
│        │(50 qty)  │          │        │        │        │ [🖨️] [📥]│
└────────┴──────────┴──────────┴────────┴────────┴────────┴──────────┘
```

---

## Action Buttons in Each Row

### When NOT Converted Yet (Order Status: PENDING):
```
[Convert] [🖨️ Print] [📥 PDF] [⚙️ Settings] [🗑️ Delete]
```

### When Already Converted (Status: RECEIVED/CONVERTED):
```
[Converted ✓] [🖨️ Print] [📥 PDF] [⚙️ Settings] [🗑️ Delete]
```

---

## How to Use

### To PRINT a Purchase Order:

```
1. Find the purchase order in the table
2. Look at the rightmost column (Actions)
3. Click the "🖨️ Print" button
4. Your system's print dialog opens
5. Select printer
6. Click Print
7. Professional report prints!
```

### To DOWNLOAD as PDF:

```
1. Find the purchase order in the table
2. Look at the rightmost column (Actions)
3. Click the "📥 PDF" button
4. File downloads automatically
5. Check your Downloads folder
6. Open with any PDF viewer
7. Save, email, or print!
```

---

## Button Behavior

### When You Click Print (🖨️):
```
Click "Print"
    ↓
Report component activates
    ↓
PDF generates in memory
    ↓
Browser print dialog opens
    ↓
Select printer
    ↓
Click "Print"
    ↓
Professional report printed!
```

### When You Click PDF (📥):
```
Click "PDF"
    ↓
Report component activates
    ↓
PDF generates
    ↓
Browser downloads file
    ↓
Filename: PurchaseOrder_[ID]_[Date].pdf
    ↓
File saved in Downloads folder
    ↓
Ready to open or share!
```

---

## File Names

### Downloaded PDF File Names:

Pattern: `PurchaseOrder_[OrderID]_[Date].pdf`

Examples:
```
PurchaseOrder_abc123xyz_2024-12-14.pdf
PurchaseOrder_def456uvw_2024-12-13.pdf
PurchaseOrder_ghi789rst_2024-12-12.pdf
```

Location: Your browser's Downloads folder

---

## Print Dialog Options

When the print dialog opens, you can:

### Select Printer:
- Physical printer
- PDF printer (Microsoft Print to PDF)
- Network printer

### Adjust Settings:
- Paper size (A4, Letter, etc.)
- Orientation (Portrait/Landscape)
- Margins (Normal, Wide, Narrow)
- Color (Color/Grayscale)

### Save as PDF:
- Instead of printing
- Choose "Save as PDF" as printer
- File saves instead of printing

---

## What Gets Printed/Downloaded

### Report Header:
```
✓ Store name
✓ Current date
✓ Order date
✓ Order ID
✓ Order status
✓ Created by
```

### Items Table:
```
✓ Serial number (S/N)
✓ Item name
✓ Model number
✓ Quantity
✓ Unit cost
✓ Total cost
✓ Store cost price
✓ Store selling price
```

### Grand Totals:
```
✓ Subtotal (supplier cost)
✓ Shipping expense
✓ TOTAL COST (items + shipping)
✓ TOTAL STORE COST
✓ TOTAL STORE SELLING PRICE
✓ POTENTIAL PROFIT
```

---

## Examples

### Example 1: Print for Supplier Follow-up

```
Purchase Order: iPhone Cases from Alibaba
Status: PENDING

Action:
1. Click [🖨️ Print]
2. Print dialog opens
3. Select printer
4. Click Print
5. Take printed report to shipping dept
6. Mail with payment to supplier
```

### Example 2: Download for Records

```
Purchase Order: Screen Protectors from AliExpress
Status: RECEIVED

Action:
1. Click [📥 PDF]
2. File downloads as PurchaseOrder_xyz_2024-12-14.pdf
3. Move to folder: C:\PurchaseOrders\2024\
4. Organized for tax time
5. Easy to find later
```

### Example 3: Email to Accountant

```
Purchase Order: Mixed items from supplier
Status: RECEIVED & CONVERTED

Action:
1. Click [📥 PDF]
2. File downloads
3. Open email client
4. Attach PurchaseOrder_xyz_2024-12-14.pdf
5. Send to accountant@company.com
6. Includes all cost breakdown
```

---

## Tips & Tricks

### Tip 1: Organize Downloads
```
✓ Create folder: "PurchaseOrders"
✓ Create subfolders: "2024", "2025", etc.
✓ Move PDFs there after downloading
✓ Easy to find for reports
```

### Tip 2: Print Multiple at Once
```
✓ Don't click anything between prints
✓ Each click opens a dialog
✓ Keep dialogs open
✓ Print each one
✓ Then close all
```

### Tip 3: Color vs Grayscale
```
✓ Color: Professional, easy to read
✓ Grayscale: Save ink
✓ Choose in print dialog
✓ Personal preference
```

### Tip 4: Save as PDF from Print Dialog
```
✓ Click [🖨️ Print]
✓ In dialog, select "Save as PDF"
✓ Click Print/Save
✓ Saves as PDF file
✓ Same result as [📥 PDF] button
```

### Tip 5: Auto-open Downloaded PDFs
```
✓ Check browser settings
✓ Can auto-open PDFs
✓ Or save to ask
✓ Choose what works for you
```

---

## Troubleshooting

### Print Dialog Doesn't Appear
- ✓ Browser might be blocking
- ✓ Check notification bar
- ✓ Allow pop-ups for this site
- ✓ Try PDF button instead

### PDF Won't Download
- ✓ Check download settings
- ✓ Browser might be set to always ask
- ✓ Check Downloads folder
- ✓ Try different browser

### Report Looks Wrong When Printed
- ✓ Try different margins
- ✓ Try different paper size
- ✓ Check print preview
- ✓ Download PDF and print that instead

### Can't Find Downloaded File
- ✓ Check Downloads folder
- ✓ Check for popup blockers
- ✓ Check browser downloads history
- ✓ Might be in Desktop instead

### Report Missing Data
- ✓ Refresh the page
- ✓ Make sure all fields filled
- ✓ Try again
- ✓ Report should show all data

---

## Browser Tips

### Chrome/Edge:
```
1. Click [🖨️ Print]
2. Dialog shows
3. Left side: select printer
4. Right side: preview
5. Click Print
```

### Firefox:
```
1. Click [🖨️ Print]
2. Same process
3. Choose printer
4. Click Print
```

### Safari (Mac):
```
1. Click [🖨️ Print]
2. Dialog shows
3. Select printer
4. Click Print
5. May need to close dialog
```

---

## FAQ

**Q: Can I print without internet?**
A: Yes! Everything works offline.

**Q: Can I edit the PDF after downloading?**
A: Most PDF readers let you add comments, but not edit content.

**Q: Does printing change my data?**
A: No, printing doesn't affect your purchase order at all.

**Q: Can I print from my phone?**
A: Yes, if you access the app from phone browser. PDF will save to phone storage.

**Q: Where do PDFs go when downloaded?**
A: Your browser's Downloads folder (ask browser where it is).

**Q: Can I print multiple at once?**
A: One at a time, but you can do them quickly one after another.

**Q: Is the report format always the same?**
A: Yes, always professional format with all details and totals.

**Q: Can I customize the report?**
A: Report format is standard. But you can edit the PDF in a PDF editor after downloading.

---

## Summary

| Action | Button | Result |
|--------|--------|--------|
| **Print to Printer** | 🖨️ Print | Report prints to selected printer |
| **Download as PDF** | 📥 PDF | File downloads to Downloads folder |
| **File Name** | N/A | PurchaseOrder_[ID]_[Date].pdf |
| **Data Included** | Both | All items, costs, totals, profit |
| **Format** | Both | Professional, color, formatted |

---

**Quick Reference Version 1.0**  
**Last Updated**: December 2024  
**Status**: ✅ Ready to Use
