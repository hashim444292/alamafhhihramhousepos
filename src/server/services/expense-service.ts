import db from "@/lib/db";
import { ExpenseInput } from "@/lib/validations/expense";

export class ExpenseService {
  private static async generateExpenseNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 7).replace(/-/g, "");
    const count = await db.expense.count();
    const seq = String(count + 1).padStart(4, "0");
    return `EXP-${dateStr}-${seq}`;
  }

  static async create(input: ExpenseInput, userId: string) {
    const expenseNumber = await this.generateExpenseNumber();

    return db.expense.create({
      data: {
        expenseNumber,
        category: input.category,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        description: input.description,
        receiptUrl: input.receiptUrl,
        date: input.date ? new Date(input.date) : new Date(),
        recordedById: userId,
      },
      include: {
        recordedBy: { select: { fullName: true, username: true } },
      },
    });
  }

  static async getAll(category?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (category && category !== "ALL") where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return db.expense.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        recordedBy: { select: { fullName: true } },
      },
    });
  }
}
