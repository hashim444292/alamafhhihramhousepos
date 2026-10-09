import db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function runComprehensiveSeed() {
  console.log("Starting comprehensive 10-day Al-Aafiah Ihram House POS seeding...");

  // 1. Wipe existing data in order of foreign key dependencies
  await db.customerLedgerEntry.deleteMany();
  await db.salesItem.deleteMany();
  await db.salesTransaction.deleteMany();
  await db.stockMovement.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.supplierLedgerEntry.deleteMany();
  await db.expense.deleteMany();
  await db.shift.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.customer.deleteMany();
  await db.supplier.deleteMany();
  await db.user.deleteMany();

  // 2. Users (Admin, Manager, 2 Cashiers)
  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash("admin123", salt);
  const managerPass = await bcrypt.hash("manager123", salt);
  const cashierPass = await bcrypt.hash("cashier123", salt);

  const admin = await db.user.create({
    data: {
      username: "admin",
      email: "admin@alafhhihram.pk",
      passwordHash: adminPass,
      fullName: "Sheikh Omar Al-Afhhihram (Owner)",
      role: "ADMIN",
    },
  });

  const manager = await db.user.create({
    data: {
      username: "manager",
      email: "manager@alafhhihram.pk",
      passwordHash: managerPass,
      fullName: "Tariq Mansoor (Store Manager)",
      role: "MANAGER",
    },
  });

  const cashier1 = await db.user.create({
    data: {
      username: "hashim",
      email: "hashim@alafhhihram.pk",
      passwordHash: cashierPass,
      fullName: "Hashim Gaziani (Counter 1)",
      role: "CASHIER",
    },
  });

  const cashier2 = await db.user.create({
    data: {
      username: "ahmed",
      email: "ahmed@alafhhihram.pk",
      passwordHash: cashierPass,
      fullName: "Ahmed Raza (Counter 2)",
      role: "CASHIER",
    },
  });

  // Additional Cashier accounts for instant login compatibility
  await db.user.create({
    data: {
      username: "cashier",
      email: "cashier@alafhhihram.pk",
      passwordHash: cashierPass,
      fullName: "Staff Cashier (کاؤنٹر کیشیئر)",
      role: "CASHIER",
    },
  });

  await db.user.create({
    data: {
      username: "cashier1",
      email: "cashier1@alafhhihram.pk",
      passwordHash: cashierPass,
      fullName: "Cashier Terminal 1",
      role: "CASHIER",
    },
  });

  // 3. Product Categories
  const catIhram = await db.category.create({
    data: {
      name: "Ihram Sets (احرام)",
      slug: "ihram-sets",
      description: "Toweling and micro-fiber pilgrim ihram garments for Hajj & Umrah",
    },
  });

  const catAccessories = await db.category.create({
    data: {
      name: "Hajj & Umrah Accessories (سامان حج)",
      slug: "accessories",
      description: "Ihram belts, shoe bags, unscented toiletries, waist pouches",
    },
  });

  const catAttar = await db.category.create({
    data: {
      name: "Attar & Sunnah Care (عطر و مسواک)",
      slug: "attar-sunnah",
      description: "Non-alcoholic perfumes, miswaks, digital tasbeeh counters",
    },
  });

  const catFootwear = await db.category.create({
    data: {
      name: "Footwear & Slippers (طواف جوتے)",
      slug: "footwear",
      description: "Anti-slip tawaf socks and soft marble slippers",
    },
  });

  const catClothing = await db.category.create({
    data: {
      name: "Men's Clothing & Thobes (جبہ و شلوار)",
      slug: "mens-clothing",
      description: "Arabic thobes, kurtas, izars, and pilgrim garments",
    },
  });

  const catWomen = await db.category.create({
    data: {
      name: "Women's Abayas & Prayer Wear (عبایا و چادر)",
      slug: "womens-wear",
      description: "Pilgrim prayer dresses, abayas, and khimars",
    },
  });

  // 4. Pakistani Suppliers
  const supFaisalabad = await db.supplier.create({
    data: {
      name: "Al-Rahman Towels & Fabrics",
      companyName: "Al-Rahman Textile Mills Ltd Faisalabad",
      phone: "+92 41 8765432",
      email: "orders@alrahmantowels.com.pk",
      address: "Millat Road Industrial Estate, Faisalabad",
      currentBalance: 65000.0, // Remaining payable Rs. 65,000
    },
  });

  const supKarachiBolton = await db.supplier.create({
    data: {
      name: "Madinah Hajj Essentials Import",
      companyName: "Madinah Traders Bolton Market",
      phone: "+92 21 32415678",
      email: "info@madinahtraders.pk",
      address: "Bolton Market, Karachi",
      currentBalance: 24500.0, // Remaining payable Rs. 24,500
    },
  });

  const supAttar = await db.supplier.create({
    data: {
      name: "Al-Haramain Attar House",
      companyName: "Sunnah Perfumers & Attar Importers",
      phone: "+92 21 34981122",
      email: "sales@alharamainattar.pk",
      address: "Jodia Bazar, Karachi",
      currentBalance: 0.0, // Fully paid up
    },
  });

  const supClothing = await db.supplier.create({
    data: {
      name: "Dar Al-Kiswa Garments",
      companyName: "Dar Al-Kiswa Tailoring & Fabrics",
      phone: "+92 42 37651234",
      email: "orders@daralkiswa.pk",
      address: "Shah Alam Market, Lahore",
      currentBalance: 32000.0, // Rs. 32,000 payable
    },
  });

  // 5. 18 Products
  const productsRaw = [
    // Ihram Sets
    {
      sku: "IHR-TURK-1400",
      barcode: "6281001230011",
      name: "Premium Turkish Cotton Ihram (1400g)",
      description: "100% combed cotton heavy 2-piece seamless towel ihram for adult pilgrims",
      categoryId: catIhram.id,
      purchasePrice: 1800.0,
      sellingPrice: 2950.0,
      stockQuantity: 65,
      minStockThreshold: 10,
      unit: "set",
      size: "Adult (110x220cm)",
      color: "Pure White",
      brand: "Al-Afhhihram Exclusive",
    },
    {
      sku: "IHR-BAMB-1200",
      barcode: "6281001230028",
      name: "Bamboo Microfiber Lightweight Ihram (1200g)",
      description: "Breathable, sweat-wicking lightweight bamboo blend fabric, rapid dry",
      categoryId: catIhram.id,
      purchasePrice: 1350.0,
      sellingPrice: 2200.0,
      stockQuantity: 48,
      minStockThreshold: 8,
      unit: "set",
      size: "Adult",
      color: "White",
      brand: "Al-Afhhihram Classic",
    },
    {
      sku: "IHR-FSD-1300",
      barcode: "6281001230035",
      name: "Faisalabad Export Quality Terry Ihram (1300g)",
      description: "Pure cotton dense loop towel ihram manufactured in Faisalabad for hot climates",
      categoryId: catIhram.id,
      purchasePrice: 1150.0,
      sellingPrice: 1900.0,
      stockQuantity: 80,
      minStockThreshold: 15,
      unit: "set",
      size: "Adult",
      color: "White",
      brand: "Al-Rahman Mills",
    },
    {
      sku: "IHR-KIDS-800",
      barcode: "6281001230042",
      name: "Junior Kids Ihram Set (800g)",
      description: "Soft cotton 2-piece set designed specifically for young pilgrims aged 6-12",
      categoryId: catIhram.id,
      purchasePrice: 850.0,
      sellingPrice: 1450.0,
      stockQuantity: 28,
      minStockThreshold: 5,
      unit: "set",
      size: "Junior (75x150cm)",
      color: "White",
      brand: "Al-Afhhihram Kids",
    },
    {
      sku: "IHR-LUX-JACQ",
      barcode: "6281001230059",
      name: "Luxury Jacquard Border Ihram (1500g)",
      description: "Heavyweight premium cotton with elegant woven border pattern",
      categoryId: catIhram.id,
      purchasePrice: 2400.0,
      sellingPrice: 3800.0,
      stockQuantity: 22,
      minStockThreshold: 5,
      unit: "set",
      size: "Adult Deluxe",
      color: "Snow White",
      brand: "Al-Afhhihram Royale",
    },

    // Belts & Bags
    {
      sku: "ACC-BELT-SEC",
      barcode: "6281001230066",
      name: "Anti-Theft Ihram Belt with Zipper (حج بیلٹ)",
      description: "Heavy duty buckled adjustable green/white belt with water-resistant zipper pockets",
      categoryId: catAccessories.id,
      purchasePrice: 450.0,
      sellingPrice: 950.0,
      stockQuantity: 95,
      minStockThreshold: 15,
      unit: "pcs",
      size: "Adjustable 30-48 in",
      color: "Green",
      brand: "Hajj Guard",
    },
    {
      sku: "ACC-BELT-LTHR",
      barcode: "6281001230073",
      name: "Pure Leather Pilgrim Waist Money Belt (چمڑے کا بیلٹ)",
      description: "Genuine brown leather pilgrim belt with hidden passport & cash compartments",
      categoryId: catAccessories.id,
      purchasePrice: 850.0,
      sellingPrice: 1600.0,
      stockQuantity: 34,
      minStockThreshold: 5,
      unit: "pcs",
      size: "Adjustable",
      color: "Brown",
      brand: "Crown Leather",
    },
    {
      sku: "ACC-TAWAF-POUCH",
      barcode: "6281001230080",
      name: "Waterproof Tawaf Neck & Shoe Pouch",
      description: "Lightweight sling bag for carrying shoes and water during Tawaf and Sa'ee",
      categoryId: catAccessories.id,
      purchasePrice: 180.0,
      sellingPrice: 400.0,
      stockQuantity: 110,
      minStockThreshold: 20,
      unit: "pcs",
      size: "One Size",
      color: "Black",
      brand: "Al-Madinah",
    },

    // Attar & Sunnah Care
    {
      sku: "ATT-OUD-12ML",
      barcode: "6281001230097",
      name: "Al-Haramain Dehn Al-Oudh Attar (12ml)",
      description: "Rich concentrated alcohol-free authentic Cambodian oudh perfume oil",
      categoryId: catAttar.id,
      purchasePrice: 1200.0,
      sellingPrice: 2100.0,
      stockQuantity: 42,
      minStockThreshold: 8,
      unit: "pcs",
      size: "12ml Tola",
      color: "Amber",
      brand: "Al-Haramain",
    },
    {
      sku: "ATT-MISWAK-5PK",
      barcode: "6281001230103",
      name: "Fresh Sewak Natural Miswak 5-Pack (مسواک)",
      description: "Vacuum sealed fresh Salvadora persica roots from Al-Madinah",
      categoryId: catAttar.id,
      purchasePrice: 160.0,
      sellingPrice: 350.0,
      stockQuantity: 120,
      minStockThreshold: 20,
      unit: "pack",
      size: "Medium",
      color: "Natural",
      brand: "Al-Falah",
    },
    {
      sku: "ATT-DIGI-TASB",
      barcode: "6281001230110",
      name: "Digital LED Ring Tasbeeh Counter (تسبیح کاؤنٹر)",
      description: "Ergonomic clicker tally counter with night light and memory function",
      categoryId: catAttar.id,
      purchasePrice: 130.0,
      sellingPrice: 300.0,
      stockQuantity: 85,
      minStockThreshold: 15,
      unit: "pcs",
      size: "Universal Ring",
      color: "White/Gold",
      brand: "Dhikr Tech",
    },
    {
      sku: "ATT-SOAP-UNSC",
      barcode: "6281001230127",
      name: "Unscented Halal Pilgrim Soap & Shampoo Pack",
      description: "100% fragrance-free olive oil bar soap strictly compliant with Ihram state restrictions",
      categoryId: catAttar.id,
      purchasePrice: 250.0,
      sellingPrice: 500.0,
      stockQuantity: 90,
      minStockThreshold: 15,
      unit: "pack",
      size: "Set of 3",
      color: "Natural",
      brand: "Pure Pilgrim",
    },

    // Footwear
    {
      sku: "FOT-TAWAF-SOCK",
      barcode: "6281001230134",
      name: "Non-Slip Tawaf Gripper Socks (طواف جرابیں)",
      description: "Breathable anti-skid leatherette base socks for marble floor grip in Haramain",
      categoryId: catFootwear.id,
      purchasePrice: 260.0,
      sellingPrice: 550.0,
      stockQuantity: 65,
      minStockThreshold: 12,
      unit: "pair",
      size: "Free Size (Adult)",
      color: "Black",
      brand: "Haram Stride",
    },
    {
      sku: "FOT-SLIP-MARBLE",
      barcode: "6281001230141",
      name: "Soft Foam Marble Walking Slippers",
      description: "Cushioned arch support waterproof slides for courtyard movement",
      categoryId: catFootwear.id,
      purchasePrice: 400.0,
      sellingPrice: 850.0,
      stockQuantity: 50,
      minStockThreshold: 10,
      unit: "pair",
      size: "42-45",
      color: "White",
      brand: "Comfort Walk",
    },

    // Clothing
    {
      sku: "CLO-THOBE-SAUD",
      barcode: "6281001230158",
      name: "Saudi Tailored White Arabic Thobe (سعودی جبہ)",
      description: "High quality Japanese polyester-cotton blend fabric with stand collar",
      categoryId: catClothing.id,
      purchasePrice: 2100.0,
      sellingPrice: 3600.0,
      stockQuantity: 38,
      minStockThreshold: 8,
      unit: "pcs",
      size: "54-58",
      color: "Bright White",
      brand: "Dar Al-Kiswa",
    },
    {
      sku: "CLO-IZAR-TEH",
      barcode: "6281001230165",
      name: "Soft Cotton Pilgrim Izar / Tehband (تہبند)",
      description: "Stitched elasticated comfortable cotton waist undergarment",
      categoryId: catClothing.id,
      purchasePrice: 450.0,
      sellingPrice: 900.0,
      stockQuantity: 55,
      minStockThreshold: 10,
      unit: "pcs",
      size: "Universal",
      color: "White",
      brand: "Al-Afhhihram",
    },

    // Women
    {
      sku: "WOM-ABAYA-NIDHA",
      barcode: "6281001230172",
      name: "2-Piece Nidha Fabric Women's Umrah Abaya (عمرہ عبایا)",
      description: "Loose fit breathable premium Korean Nidha fabric with attached hijab and zippered security cuffs",
      categoryId: catWomen.id,
      purchasePrice: 2600.0,
      sellingPrice: 4500.0,
      stockQuantity: 28,
      minStockThreshold: 6,
      unit: "set",
      size: "54-56",
      color: "Black",
      brand: "Fatima Couture",
    },
    {
      sku: "WOM-CHADAR-KHM",
      barcode: "6281001230189",
      name: "Breathable Cotton Prayer Chadar / Khimar (نماز چادر)",
      description: "Pure soft lawn cotton oversized prayer sheet with stretchable face opening",
      categoryId: catWomen.id,
      purchasePrice: 950.0,
      sellingPrice: 1750.0,
      stockQuantity: 44,
      minStockThreshold: 10,
      unit: "pcs",
      size: "Oversized",
      color: "Off-White",
      brand: "Bibi Maryam",
    },
  ];

  const products: any[] = [];
  for (const p of productsRaw) {
    const created = await db.product.create({ data: p });
    products.push(created);

    await db.stockMovement.create({
      data: {
        productId: created.id,
        movementType: "STOCK_IN_PO",
        quantity: created.stockQuantity,
        previousStock: 0,
        newStock: created.stockQuantity,
        referenceType: "INITIAL_STOCK",
        notes: "Initial inventory setup",
        performedById: admin.id,
      },
    });
  }

  // 6. Registered Customers
  const cust1 = await db.customer.create({
    data: {
      name: "Haji Muhammad Aslam",
      phone: "0300-4567890",
      email: "aslam.haji@gmail.com",
      address: "Allama Iqbal Town, Lahore",
      balance: 8500.0, // Rs. 8,500 pending Udhaar
      creditLimit: 50000.0,
      paymentTermsDays: 15,
    },
  });

  const cust2 = await db.customer.create({
    data: {
      name: "Qari Abdul Qayyum (Madrasa)",
      phone: "0321-9876543",
      email: "qari.qayyum@gmail.com",
      address: "Gulshan-e-Iqbal, Karachi",
      balance: 18500.0, // Rs. 18,500 Udhaar
      creditLimit: 100000.0,
      paymentTermsDays: 30,
    },
  });

  const cust3 = await db.customer.create({
    data: {
      name: "Bilal Ahmed & Sons (Wholesale)",
      phone: "0333-8889900",
      address: "Tariq Road, Karachi",
      balance: 14200.0, // Rs. 14,200 Udhaar
      creditLimit: 80000.0,
      paymentTermsDays: 15,
    },
  });

  const cust4 = await db.customer.create({
    data: {
      name: "Chaudhry Tariq Mehmood",
      phone: "0345-5551234",
      address: "DHA Phase 5, Karachi",
      balance: 0.0, // Clear balance
      creditLimit: 40000.0,
      paymentTermsDays: 7,
    },
  });

  // 7. Seed 10 Days of Shifts, Sales Invoices, Expenses, Purchases
  // Day offsets from 9 days ago to 0 days ago (Today)
  const now = new Date();
  let invoiceCounter = 1000;
  let expenseCounter = 100;
  let poCounter = 10;

  const expenseTemplates = [
    { category: "RENT", amount: 12000, desc: "Showroom monthly rent installment share (Urdu Bazar)", method: "BANK_TRANSFER" },
    { category: "UTILITIES", amount: 6800, desc: "K-Electric commercial electricity bill", method: "BANK_TRANSFER" },
    { category: "PACKAGING", amount: 4500, desc: "1000x Branded golden printed carry bags (Urdu Bazar Press)", method: "CASH" },
    { category: "TEA_REFRESHMENT", amount: 850, desc: "Daily tea, green chai & bakery biscuits for guests & staff", method: "CASH" },
    { category: "TRANSPORT", amount: 1500, desc: "Shehzore pickup freight from Bolton Market to shop", method: "CASH" },
    { category: "TEA_REFRESHMENT", amount: 950, desc: "Evening refreshment & mineral water bottles", method: "CASH" },
    { category: "MISC", amount: 1200, desc: "Store cleaning materials, phenyl, mops & air freshener", method: "CASH" },
    { category: "UTILITIES", amount: 3500, desc: "Generator diesel for load-shedding backup (20 Litres)", method: "CASH" },
    { category: "SALARIES", amount: 15000, desc: "Mid-month staff advance salary disbursement", method: "CASH" },
    { category: "TEA_REFRESHMENT", amount: 800, desc: "Dhaba tea & samosa for sales team", method: "CASH" },
    { category: "PACKAGING", amount: 2800, desc: "Transparent polythene garment packaging rolls & tape", method: "CASH" },
    { category: "TRANSPORT", amount: 2200, desc: "Goods transport bilty charges from Faisalabad cargo", method: "CASH" },
  ];

  for (let dayOffset = 9; dayOffset >= 0; dayOffset--) {
    const shiftDate = new Date(now);
    shiftDate.setDate(now.getDate() - dayOffset);

    const shiftOpenTime = new Date(shiftDate);
    shiftOpenTime.setHours(9, 30, 0, 0);

    const shiftCloseTime = new Date(shiftDate);
    shiftCloseTime.setHours(22, 0, 0, 0);

    const isToday = dayOffset === 0;
    const assignedCashier = dayOffset % 2 === 0 ? cashier1 : cashier2;

    // Create Shift
    const shift = await db.shift.create({
      data: {
        shiftNumber: 10 - dayOffset,
        cashierId: assignedCashier.id,
        openedAt: shiftOpenTime,
        closedAt: isToday ? null : shiftCloseTime,
        openingCash: 10000.0,
        closingCash: isToday ? null : 28500.0 + (dayOffset * 800),
        systemExpectedCash: isToday ? null : 28500.0 + (dayOffset * 800),
        cashDifference: isToday ? null : 0.0,
        totalSalesAmount: 0.0, // will increment
        totalTransactions: 0,
        status: isToday ? "OPEN" : "CLOSED",
        notes: isToday ? "Active daytime counter register" : `Day closed smoothly with zero cash variance`,
      },
    });

    // 3 to 4 Sales for this day
    const salesCountThisDay = 3 + (dayOffset % 2);
    let dayTotalSales = 0;

    for (let sIdx = 0; sIdx < salesCountThisDay; sIdx++) {
      invoiceCounter++;
      const saleTime = new Date(shiftDate);
      saleTime.setHours(10 + sIdx * 3, 15 + (sIdx * 10), 0, 0);

      // Select 1 to 3 items
      const item1 = products[(dayOffset + sIdx) % products.length];
      const item2 = products[(dayOffset + sIdx + 4) % products.length];
      const qty1 = 1 + (sIdx % 2);
      const qty2 = 1;

      const subtotal = (item1.sellingPrice * qty1) + (item2.sellingPrice * qty2);
      const discount = sIdx === 1 ? 150.0 : 0.0;
      const totalAmount = subtotal - discount;

      // Determine payment mode & customer
      let paymentMethod = "CASH";
      let custId: string | null = null;
      let custName = "Walk-in Cash Customer";
      let custPhone: string | null = null;
      let balanceDue = 0.0;
      let amountTendered = totalAmount;
      let changeDue = 0.0;

      if (sIdx === 0 && dayOffset % 3 === 0) {
        // Credit sale to Haji Aslam
        paymentMethod = "CREDIT";
        custId = cust1.id;
        custName = cust1.name;
        custPhone = cust1.phone;
        balanceDue = totalAmount;
        amountTendered = 0.0;
      } else if (sIdx === 2 && dayOffset % 2 === 0) {
        // Card sale
        paymentMethod = "CARD";
        custName = cust4.name;
        custPhone = cust4.phone;
        custId = cust4.id;
      } else if (sIdx === 1 && dayOffset % 4 === 0) {
        // Partial credit sale to Qari Abdul Qayyum
        paymentMethod = "CREDIT";
        custId = cust2.id;
        custName = cust2.name;
        custPhone = cust2.phone;
        const partialCash = 2000.0;
        balanceDue = Math.max(0, totalAmount - partialCash);
        amountTendered = partialCash;
      } else {
        // Normal cash sale
        paymentMethod = "CASH";
        amountTendered = totalAmount + 100.0;
        changeDue = 100.0;
      }

      const invoiceNum = `INV-202610-${invoiceCounter}`;

      const sale = await db.salesTransaction.create({
        data: {
          invoiceNumber: invoiceNum,
          cashierId: assignedCashier.id,
          shiftId: shift.id,
          customerId: custId,
          customerName: custName,
          customerPhone: custPhone,
          subtotal,
          discountType: discount > 0 ? "FIXED" : null,
          discountValue: discount,
          discountAmount: discount,
          taxRate: 0.0,
          taxAmount: 0.0,
          totalAmount,
          paymentMethod,
          amountTendered,
          changeDue,
          balanceDue,
          status: "COMPLETED",
          createdAt: saleTime,
          updatedAt: saleTime,
          items: {
            create: [
              {
                productId: item1.id,
                productName: item1.name,
                sku: item1.sku,
                quantity: qty1,
                unitPrice: item1.sellingPrice,
                costPrice: item1.purchasePrice,
                discountAmount: discount > 0 ? discount : 0,
                subtotalAmount: (item1.sellingPrice * qty1) - (discount > 0 ? discount : 0),
              },
              {
                productId: item2.id,
                productName: item2.name,
                sku: item2.sku,
                quantity: qty2,
                unitPrice: item2.sellingPrice,
                costPrice: item2.purchasePrice,
                discountAmount: 0,
                subtotalAmount: item2.sellingPrice * qty2,
              },
            ],
          },
        },
      });

      // Stock movements for items
      await db.stockMovement.create({
        data: {
          productId: item1.id,
          movementType: "STOCK_OUT_SALE",
          quantity: qty1,
          previousStock: item1.stockQuantity,
          newStock: Math.max(0, item1.stockQuantity - qty1),
          referenceId: invoiceNum,
          referenceType: "SALE",
          notes: `POS Checkout #${invoiceNum}`,
          performedById: assignedCashier.id,
          createdAt: saleTime,
        },
      });

      // If credit sale, create customer ledger entry
      if (custId && balanceDue > 0) {
        await db.customerLedgerEntry.create({
          data: {
            customerId: custId,
            referenceType: "SALE_INVOICE",
            referenceId: invoiceNum,
            debit: balanceDue,
            credit: 0.0,
            runningBalance: balanceDue + 2000,
            notes: `Credit purchase on Invoice #${invoiceNum}`,
            createdAt: saleTime,
          },
        });
      }

      dayTotalSales += totalAmount;
    }

    // Update shift totals
    await db.shift.update({
      where: { id: shift.id },
      data: {
        totalSalesAmount: dayTotalSales,
        totalTransactions: salesCountThisDay,
      },
    });

    // 1 to 2 Expenses on this day
    const exp1 = expenseTemplates[(dayOffset * 2) % expenseTemplates.length];
    expenseCounter++;
    const expTime = new Date(shiftDate);
    expTime.setHours(14, 30, 0, 0);

    await db.expense.create({
      data: {
        expenseNumber: `EXP-202610-${expenseCounter}`,
        category: exp1.category,
        amount: exp1.amount,
        paymentMethod: exp1.method,
        description: exp1.desc,
        date: expTime,
        recordedById: manager.id,
        createdAt: expTime,
      },
    });

    if (dayOffset % 2 === 0) {
      const exp2 = expenseTemplates[(dayOffset * 2 + 1) % expenseTemplates.length];
      expenseCounter++;
      const exp2Time = new Date(shiftDate);
      exp2Time.setHours(17, 45, 0, 0);

      await db.expense.create({
        data: {
          expenseNumber: `EXP-202610-${expenseCounter}`,
          category: exp2.category,
          amount: exp2.amount,
          paymentMethod: exp2.method,
          description: exp2.desc,
          date: exp2Time,
          recordedById: admin.id,
          createdAt: exp2Time,
        },
      });
    }

    // Purchase Orders on specific days (e.g., 8 days ago, 5 days ago, 2 days ago)
    if (dayOffset === 8 || dayOffset === 5 || dayOffset === 2) {
      poCounter++;
      const poSupplier = dayOffset === 8 ? supFaisalabad : dayOffset === 5 ? supKarachiBolton : supClothing;
      const poAmount = dayOffset === 8 ? 85000.0 : dayOffset === 5 ? 42000.0 : 64000.0;
      const paidAmount = dayOffset === 8 ? 50000.0 : dayOffset === 5 ? 25000.0 : 32000.0;
      const balanceAmount = poAmount - paidAmount;
      const poNum = `PO-202610-00${poCounter}`;

      const poDate = new Date(shiftDate);
      poDate.setHours(11, 0, 0, 0);

      const po = await db.purchaseOrder.create({
        data: {
          poNumber: poNum,
          supplierId: poSupplier.id,
          orderDate: poDate,
          receivedDate: poDate,
          totalAmount: poAmount,
          paidAmount,
          balanceAmount,
          paymentMethod: "BANK_TRANSFER",
          status: "RECEIVED",
          notes: `Bulk replenishment delivered from ${poSupplier.companyName}`,
          createdAt: poDate,
          items: {
            create: [
              {
                productId: products[dayOffset % products.length].id,
                quantityOrdered: 30,
                quantityReceived: 30,
                unitCost: products[dayOffset % products.length].purchasePrice,
                totalCost: products[dayOffset % products.length].purchasePrice * 30,
              },
            ],
          },
        },
      });

      // Supplier ledger entries
      await db.supplierLedgerEntry.create({
        data: {
          supplierId: poSupplier.id,
          referenceType: "PURCHASE_BILL",
          referenceId: poNum,
          debit: 0.0,
          credit: poAmount,
          runningBalance: poAmount,
          notes: `Stock bill #${poNum}`,
          createdAt: poDate,
        },
      });

      await db.supplierLedgerEntry.create({
        data: {
          supplierId: poSupplier.id,
          referenceType: "PAYMENT_MADE",
          referenceId: `PAY-MEEZAN-${poCounter}`,
          debit: paidAmount,
          credit: 0.0,
          runningBalance: balanceAmount,
          notes: `Advance payment via Meezan Bank online transfer`,
          createdAt: poDate,
        },
      });
    }

    // Customer Udhaar Recovery on specific days
    if (dayOffset === 6 || dayOffset === 3 || dayOffset === 1) {
      const recDate = new Date(shiftDate);
      recDate.setHours(16, 20, 0, 0);
      const recAmount = dayOffset === 6 ? 5000.0 : dayOffset === 3 ? 8000.0 : 3500.0;
      const recCust = dayOffset === 6 ? cust1 : dayOffset === 3 ? cust2 : cust3;

      await db.customerLedgerEntry.create({
        data: {
          customerId: recCust.id,
          referenceType: "PAYMENT_RECEIVED",
          referenceId: `RCV-CASH-${dayOffset}`,
          debit: 0.0,
          credit: recAmount,
          runningBalance: Math.max(0, recCust.balance),
          notes: `Cash installment received on counter by ${assignedCashier.fullName}`,
          createdAt: recDate,
        },
      });
    }
  }

  console.log("Seeding finished successfully! 10 Days of complete transactions loaded.");
  return {
    success: true,
    message: "Comprehensive 10-day demo data successfully populated!",
    counts: {
      users: 4,
      categories: 6,
      products: products.length,
      suppliers: 4,
      customers: 4,
      shifts: 10,
    },
  };
}
