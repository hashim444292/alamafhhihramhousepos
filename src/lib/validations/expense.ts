import { z } from "zod";

export const ExpenseSchema = z.object({
  category: z.enum([
    "RENT",
    "UTILITIES",
    "PACKAGING",
    "TRANSPORT",
    "SALARIES",
    "MARKETING",
    "TEA_REFRESHMENT",
    "MISC",
  ]),
  amount: z.number().positive("Amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).default("CASH"),
  description: z.string().min(3, "Description is required"),
  receiptUrl: z.string().optional().nullable(),
  date: z.string().optional(),
});

export type ExpenseInput = z.infer<typeof ExpenseSchema>;
