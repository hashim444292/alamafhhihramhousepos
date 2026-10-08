import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Al-Afhhihram House POS database (Pakistan PKR & Khata Setup)...");

  // 1. Clear existing data safely
  await prisma.customerLedgerEntry.deleteMany();
  await prisma.salesItem.deleteMany();
  await prisma.salesTransaction.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplierLedgerEntry.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users with RBAC
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash("admin123", salt);
  const managerPassword = await bcrypt.hash("manager123", salt);
  const cashierPassword = await bcrypt.hash("cashier123", salt);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@alafhhihram.pk",
      passwordHash: adminPassword,
      fullName: "Sheikh Omar Al-Afhhihram",
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.create({
    data: {
      username: "manager",
      email: "manager@alafhhihram.pk",
      passwordHash: managerPassword,
      fullName: "Tariq Mansour",
      role: "MANAGER",
    },
  });

  const cashier = await prisma.user.create({
    data: {
      username: "cashier1",
      email: "cashier1@alafhhihram.pk",
      passwordHash: cashierPassword,
      fullName: "Bilal Ahmad",
      role: "CASHIER",
    },
  });

  console.log("Users created: Admin, Manager, Cashier");

  // 3. Seed Product Categories
  const catIhram = await prisma.category.create({
    data: {
      name: "Ihram Sets (احرام)",
      slug: "ihram-sets",
      description: "Toweling and micro-fiber pilgrim ihram garments for Hajj & Umrah",
    },
  });

  const catAccessories = await prisma.category.create({
    data: {
      name: "Hajj & Umrah Accessories (سامان حج)",
      slug: "hajj-umrah-accessories",
      description: "Ihram belts, shoe bags, unscented toiletries, waist pouches",
    },
  });

  const catClothing = await prisma.category.create({
    data: {
      name: "Men's Clothing & Thobes (جبہ و شلوار)",
      slug: "mens-clothing",
      description: "Arabic thobes, kurtas, izars, and pilgrim garments",
    },
  });

  const catWomen = await prisma.category.create({
    data: {
      name: "Women's Abayas & Prayer Wear (عبایا و چادر)",
      slug: "womens-wear",
      description: "Pilgrim prayer dresses, abayas, and khimars",
    },
  });

  const catFragrance = await prisma.category.create({
    data: {
      name: "Attar & Sunnah Care (عطر و مسواک)",
      slug: "attar-sunnah",
      description: "Non-alcoholic perfumes, miswaks, digital tasbeeh counters",
    },
  });

  // 4. Seed Pakistani Suppliers / Vendors
  const supplier1 = await prisma.supplier.create({
    data: {
      name: "Al-Rahman Towels & Fabrics",
      companyName: "Al-Rahman Textile Mills Ltd",
      phone: "+92 41 8765432",
      email: "orders@alrahmantowels.com.pk",
      address: "Millat Road Industrial Estate, Faisalabad",
      currentBalance: 45000.0, // Remaining payable to vendor (Rs. 45,000)
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: "Madinah Hajj Essentials Import",
      companyName: "Madinah Traders",
      phone: "+92 21 34567890",
      email: "info@madinahtraders.pk",
      address: "Bolton Market, Karachi",
      currentBalance: 18500.0, // Rs. 18,500 pending bill
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: "Sunnah Perfumers & Accessories",
      companyName: "Al-Harmain Attar House",
      phone: "+92 42 37651234",
      email: "sales@sunnahperfumes.pk",
      address: "Shah Alam Market, Lahore",
      currentBalance: 0.0, // Fully paid
    },
  });

  // 5. Seed Products with Pakistani Rupee (PKR / Rs.) Pricing
  const productsData = [
    {
      sku: "IHR-TURK-1400",
      barcode: "6281001230011",
      name: "Premium Turkish Cotton Ihram (1400g)",
      description: "100% combed cotton heavy 2-piece seamless towel ihram for adult pilgrims",
      categoryId: catIhram.id,
      purchasePrice: 1750.0,
      sellingPrice: 2850.0,
      stockQuantity: 45,
      minStockThreshold: 10,
      unit: "set",
      size: "Adult (110x220cm)",
      color: "Pure White",
      brand: "Al-Afhhihram Exclusive",
    },
    {
      sku: "IHR-BAMB-1200",
      barcode: "6281001230028",
      name: "Bamboo Microfiber Lightweight Ihram",
      description: "Breathable, sweat-wicking lightweight bamboo blend fabric, rapid dry",
      categoryId: catIhram.id,
      purchasePrice: 1350.0,
      sellingPrice: 2200.0,
      stockQuantity: 32,
      minStockThreshold: 8,
      unit: "set",
      size: "Adult",
      color: "White",
      brand: "Al-Afhhihram Classic",
    },
    {
      sku: "IHR-KIDS-800",
      barcode: "6281001230035",
      name: "Junior Kids Ihram Set (800g)",
      description: "Soft cotton 2-piece set designed specifically for young pilgrims aged 6-12",
      categoryId: catIhram.id,
      purchasePrice: 850.0,
      sellingPrice: 1450.0,
      stockQuantity: 18,
      minStockThreshold: 5,
      unit: "set",
      size: "Junior (75x150cm)",
      color: "White",
      brand: "Al-Afhhihram Kids",
    },
    {
      sku: "ACC-BELT-SEC",
      barcode: "6281001230042",
      name: "Anti-Theft Ihram Belt with Money Pouch (حج بیلٹ)",
      description: "Heavy duty buckled adjustable green/white belt with water-resistant zipper pockets",
      categoryId: catAccessories.id,
      purchasePrice: 420.0,
      sellingPrice: 850.0,
      stockQuantity: 80,
      minStockThreshold: 15,
      unit: "pcs",
      size: "Adjustable 30-48 in",
      color: "Green",
      brand: "Hajj Guard",
    },
    {
      sku: "ACC-SOAP-UNSC",
      barcode: "6281001230059",
      name: "Unscented Halal Pilgrim Soap 3-Pack (بے خوشبو صابن)",
      description: "100% fragrance-free olive oil bar soap strictly compliant with Ihram state restrictions",
      categoryId: catAccessories.id,
      purchasePrice: 220.0,
      sellingPrice: 450.0,
      stockQuantity: 120,
      minStockThreshold: 25,
      unit: "pack",
      size: "3x100g",
      color: "Natural",
      brand: "Pure Pilgrim",
    },
    {
      sku: "ACC-TAWAF-SLIP",
      barcode: "6281001230066",
      name: "Non-Slip Tawaf & Sai Socks (طواف جرابیں)",
      description: "Breathable anti-skid leatherette base socks for marble floor grip in Haramain",
      categoryId: catAccessories.id,
      purchasePrice: 280.0,
      sellingPrice: 550.0,
      stockQuantity: 4, // Low stock alert
      minStockThreshold: 15,
      unit: "pair",
      size: "L (41-44)",
      color: "Black",
      brand: "Haram Stride",
    },
    {
      sku: "CLO-THOBE-SAUD",
      barcode: "6281001230073",
      name: "Saudi Tailored White Arabic Thobe (سعودی جبہ)",
      description: "High quality Japanese polyester-cotton blend fabric with stand collar",
      categoryId: catClothing.id,
      purchasePrice: 1950.0,
      sellingPrice: 3500.0,
      stockQuantity: 22,
      minStockThreshold: 6,
      unit: "pcs",
      size: "56L",
      color: "Bright White",
      brand: "Dar Al-Thobe",
    },
    {
      sku: "WOM-ABAYA-PILG",
      barcode: "6281001230080",
      name: "Women's 2-Piece Umrah Prayer Abaya (عمرہ عبایا)",
      description: "Loose fit breathable Nidha fabric with attached hijab and zippered security cuffs",
      categoryId: catWomen.id,
      purchasePrice: 2400.0,
      sellingPrice: 4200.0,
      stockQuantity: 15,
      minStockThreshold: 5,
      unit: "set",
      size: "54",
      color: "Black",
      brand: "Fatima Couture",
    },
    {
      sku: "SUN-MISWAK-5PK",
      barcode: "6281001230097",
      name: "Fresh Sewak Natural Miswak (5-Pack مسواک)",
      description: "Vacuum sealed fresh Salvadora persica roots from Al-Madinah",
      categoryId: catFragrance.id,
      purchasePrice: 150.0,
      sellingPrice: 350.0,
      stockQuantity: 65,
      minStockThreshold: 10,
      unit: "pack",
      size: "Medium",
      color: "Natural",
      brand: "Al-Falah",
    },
    {
      sku: "SUN-DIGI-TASB",
      barcode: "6281001230103",
      name: "Digital Ring Tasbeeh Counter with LED (تسبیح کاؤنٹر)",
      description: "Ergonomic clicker tally counter with night light and memory function",
      categoryId: catFragrance.id,
      purchasePrice: 120.0,
      sellingPrice: 280.0,
      stockQuantity: 3, // Low stock alert
      minStockThreshold: 10,
      unit: "pcs",
      size: "Universal Ring",
      color: "White/Gold",
      brand: "Dhikr Tech",
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: item,
    });

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        movementType: "STOCK_IN_PO",
        quantity: item.stockQuantity,
        previousStock: 0,
        newStock: item.stockQuantity,
        referenceType: "INITIAL_STOCK",
        notes: "Opening balance setup",
        performedById: admin.id,
      },
    });
  }

  // 6. Seed Supplier Purchase Bill History
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "BILL-2026-001",
      supplierId: supplier1.id,
      totalAmount: 95000.0,
      paidAmount: 50000.0,
      balanceAmount: 45000.0,
      paymentMethod: "BANK_TRANSFER",
      status: "RECEIVED",
      notes: "50x Turkish Ihram sets + packaging received",
    },
  });

  await prisma.supplierLedgerEntry.create({
    data: {
      supplierId: supplier1.id,
      referenceType: "PURCHASE_BILL",
      referenceId: po1.poNumber,
      debit: 0.0,
      credit: 95000.0,
      runningBalance: 95000.0,
      notes: "Purchased 50x Turkish Ihram batch",
    },
  });

  await prisma.supplierLedgerEntry.create({
    data: {
      supplierId: supplier1.id,
      referenceType: "PAYMENT_MADE",
      referenceId: "PAY-BANK-7721",
      debit: 50000.0,
      credit: 0.0,
      runningBalance: 45000.0,
      notes: "Part payment via Meezan Bank transfer",
    },
  });

  // 7. Seed Regular / Known Customers (Janne Wale / Khata Customers)
  const cust1 = await prisma.customer.create({
    data: {
      name: "Haji Muhammad Aslam",
      phone: "0300-4567890",
      email: "aslam.haji@gmail.com",
      address: "Allama Iqbal Town, Lahore",
      balance: 3500.0, // Rs. 3,500 pending Udhaar / Receivable
      creditLimit: 50000.0,
    },
  });

  const cust2 = await prisma.customer.create({
    data: {
      name: "Qari Abdul Qayyum (Madrasa)",
      phone: "0321-9876543",
      email: "qari.qayyum@gmail.com",
      address: "Gulshan-e-Iqbal, Karachi",
      balance: 12000.0, // Rs. 12,000 Udhaar
      creditLimit: 75000.0,
    },
  });

  const cust3 = await prisma.customer.create({
    data: {
      name: "Chaudhry Tariq Mehmood",
      phone: "0333-5551234",
      address: "Satellite Town, Rawalpindi",
      balance: 0.0, // Zero balance (pays exact cash)
      creditLimit: 30000.0,
    },
  });

  // Customer Ledger Entries
  await prisma.customerLedgerEntry.create({
    data: {
      customerId: cust1.id,
      referenceType: "SALE_INVOICE",
      referenceId: "INV-PREV-1001",
      debit: 8500.0,
      credit: 0.0,
      runningBalance: 8500.0,
      notes: "Purchased 3x Ihram sets + Accessories for family Umrah",
    },
  });

  await prisma.customerLedgerEntry.create({
    data: {
      customerId: cust1.id,
      referenceType: "PAYMENT_RECEIVED",
      referenceId: "RCV-CASH-401",
      debit: 0.0,
      credit: 5000.0,
      runningBalance: 3500.0,
      notes: "Cash payment received on counter",
    },
  });

  // 8. Open Shift for Cashier
  await prisma.shift.create({
    data: {
      cashierId: cashier.id,
      shiftNumber: 1,
      openingCash: 10000.0, // Rs. 10,000 opening cash float
      status: "OPEN",
      notes: "Morning shift counter terminal #1",
    },
  });

  // 9. Expenses in PKR
  await prisma.expense.create({
    data: {
      expenseNumber: "EXP-202610-001",
      category: "PACKAGING",
      amount: 4500.0,
      paymentMethod: "CASH",
      description: "1000x Branded shopping bags for Ihram sets (Urdu Bazar Press)",
      recordedById: manager.id,
    },
  });

  await prisma.expense.create({
    data: {
      expenseNumber: "EXP-202610-002",
      category: "UTILITIES",
      amount: 14200.0,
      paymentMethod: "BANK_TRANSFER",
      description: "Showroom LESCO electricity & cooling bill",
      recordedById: admin.id,
    },
  });

  console.log("Seeding completed successfully for Pakistan (PKR & Khata)!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
