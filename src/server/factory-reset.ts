import db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function runFactoryReset() {
  console.log("Starting Full Factory Reset for Al-Afhhihram House POS...");

  // 1. Wipe all transactional data & ledgers in foreign-key dependency order
  const deletedCustomerLedgers = await db.customerLedgerEntry.deleteMany();
  const deletedSupplierLedgers = await db.supplierLedgerEntry.deleteMany();
  const deletedSalesItems = await db.salesItem.deleteMany();
  const deletedSales = await db.salesTransaction.deleteMany();
  const deletedPurchaseOrderItems = await db.purchaseOrderItem.deleteMany();
  const deletedPurchaseOrders = await db.purchaseOrder.deleteMany();
  const deletedStockMovements = await db.stockMovement.deleteMany();
  const deletedExpenses = await db.expense.deleteMany();
  const deletedShifts = await db.shift.deleteMany();
  const deletedProducts = await db.product.deleteMany();
  const deletedCategories = await db.category.deleteMany();
  const deletedSuppliers = await db.supplier.deleteMany();
  const deletedCustomers = await db.customer.deleteMany();

  // 2. Ensure essential default users exist if database was completely empty
  const existingUsersCount = await db.user.count();
  if (existingUsersCount === 0) {
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash("admin123", salt);
    const managerPass = await bcrypt.hash("manager123", salt);
    const cashierPass = await bcrypt.hash("cashier123", salt);

    await db.user.create({
      data: {
        username: "admin",
        email: "admin@alafhhihram.pk",
        passwordHash: adminPass,
        fullName: "Store Owner (Admin)",
        role: "ADMIN",
      },
    });

    await db.user.create({
      data: {
        username: "manager",
        email: "manager@alafhhihram.pk",
        passwordHash: managerPass,
        fullName: "Store Manager",
        role: "MANAGER",
      },
    });

    await db.user.create({
      data: {
        username: "cashier",
        email: "cashier@alafhhihram.pk",
        passwordHash: cashierPass,
        fullName: "Main Counter Cashier",
        role: "CASHIER",
      },
    });

    await db.user.create({
      data: {
        username: "hashim",
        email: "hashim@alafhhihram.pk",
        passwordHash: cashierPass,
        fullName: "Hashim (Cashier)",
        role: "CASHIER",
      },
    });
  }

  // 3. Create fresh default Walk-in Customer for retail cash sales
  const walkInCustomer = await db.customer.create({
    data: {
      name: "Walk-in Customer",
      phone: "03000000000",
      balance: 0.0,
      creditLimit: 0.0,
      isActive: true,
    },
  });

  return {
    success: true,
    message: "Factory Reset completed successfully. All dummy transactions, products, categories, suppliers, and customers have been cleared.",
    deleted: {
      customerLedgerEntries: deletedCustomerLedgers.count,
      supplierLedgerEntries: deletedSupplierLedgers.count,
      salesItems: deletedSalesItems.count,
      salesTransactions: deletedSales.count,
      purchaseOrderItems: deletedPurchaseOrderItems.count,
      purchaseOrders: deletedPurchaseOrders.count,
      stockMovements: deletedStockMovements.count,
      expenses: deletedExpenses.count,
      shifts: deletedShifts.count,
      products: deletedProducts.count,
      categories: deletedCategories.count,
      suppliers: deletedSuppliers.count,
      customers: deletedCustomers.count,
    },
    retained: {
      usersCount: await db.user.count(),
      walkInCustomerId: walkInCustomer.id,
      walkInCustomerName: walkInCustomer.name,
    },
  };
}
