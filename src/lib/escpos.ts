/**
 * ESC/POS Thermal Receipt Utility
 * 
 * Provides ESC/POS command generation for direct raw binary printing to
 * 80mm and 58mm thermal printers (USB, Serial, or Network) in Electron or Tauri environments.
 */

export interface ReceiptData {
  storeName: string;
  storeTagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  invoiceNumber: string;
  cashierName: string;
  date: Date;
  customerName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountTendered: number;
  changeDue: number;
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private cols: number;

  constructor(width: "80mm" | "58mm" = "80mm") {
    // 80mm printers typically have 48 columns (Font A) or 64 (Font B)
    // 58mm printers typically have 32 columns (Font A) or 42 (Font B)
    this.cols = width === "80mm" ? 48 : 32;
    this.init();
  }

  init() {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  alignCenter() {
    this.buffer.push(0x1b, 0x61, 0x01);
    return this;
  }

  alignLeft() {
    this.buffer.push(0x1b, 0x61, 0x00);
    return this;
  }

  alignRight() {
    this.buffer.push(0x1b, 0x61, 0x02);
    return this;
  }

  bold(enable: boolean) {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  doubleSize(enable: boolean) {
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00); // GS ! n
    return this;
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  text(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
    return this;
  }

  textLine(str: string) {
    this.text(str);
    this.feed(1);
    return this;
  }

  divider(char = "-") {
    this.textLine(char.repeat(this.cols));
    return this;
  }

  row(col1: string, col2: string) {
    const spaceCount = Math.max(1, this.cols - col1.length - col2.length);
    const line = col1 + " ".repeat(spaceCount) + col2;
    this.textLine(line);
    return this;
  }

  cutPaper() {
    this.feed(3);
    this.buffer.push(0x1d, 0x56, 0x41, 0x00); // GS V 65 0 (Partial cut)
    return this;
  }

  openCashDrawer() {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  static generateReceiptBuffer(data: ReceiptData, width: "80mm" | "58mm" = "80mm"): Uint8Array {
    const p = new EscPosBuilder(width);

    // Header
    p.alignCenter().bold(true).doubleSize(true).textLine(data.storeName);
    p.doubleSize(false).bold(false);
    if (data.storeTagline) p.textLine(data.storeTagline);
    if (data.address) p.textLine(data.address);
    if (data.phone) p.textLine(`Tel: ${data.phone}`);
    if (data.email) p.textLine(data.email);
    if (data.taxNumber) p.textLine(`STRN/NTN: ${data.taxNumber}`);
    p.divider("=");

    // Invoice Meta
    p.alignLeft();
    p.row("Invoice:", data.invoiceNumber);
    p.row("Date:", data.date.toLocaleString("en-PK"));
    p.row("Cashier:", data.cashierName);
    if (data.customerName) p.row("Customer:", data.customerName);
    p.divider("-");

    // Line items
    p.bold(true);
    if (width === "80mm") {
      p.row("Item (Qty x Price)", "Total");
    } else {
      p.row("Item", "Total");
    }
    p.bold(false);

    data.items.forEach((item) => {
      p.textLine(item.name);
      p.row(`  ${item.quantity} x ${item.unitPrice.toFixed(2)}`, item.subtotal.toFixed(2));
    });

    p.divider("-");

    // Financial Breakdown
    p.row("Subtotal:", data.subtotal.toFixed(2));
    if (data.discount > 0) {
      p.row("Discount:", `-${data.discount.toFixed(2)}`);
    }
    if (data.tax > 0) {
      p.row("SST/Tax:", data.tax.toFixed(2));
    }
    p.divider("=");

    // Grand Total
    p.bold(true).doubleSize(true);
    p.row("TOTAL (PKR):", `Rs. ${data.total.toFixed(2)}`);
    p.doubleSize(false).bold(false);

    p.divider("-");
    p.row("Payment Method:", data.paymentMethod);
    p.row("Paid Amount:", data.amountTendered.toFixed(2));
    p.row("Change Due:", data.changeDue.toFixed(2));

    // Footer
    p.divider("-");
    p.alignCenter();
    p.textLine("Jazakum Allahu Khairan");
    p.textLine("May your Hajj & Umrah be accepted");
    p.textLine("Exchange within 7 days with invoice");
    p.cutPaper();

    return p.build();
  }
}
