import { SalesService } from "./sales-service";
import { CheckoutInput } from "@/lib/validations/sales";

export interface SyncResult {
  clientTransactionId: string;
  serverInvoiceNumber?: string;
  status: "SYNCED" | "DUPLICATE_IGNORED" | "FAILED";
  error?: string;
}

export class SyncService {
  static async processBatch(
    transactions: CheckoutInput[],
    cashierId: string
  ): Promise<{ results: SyncResult[]; totalProcessed: number; failedCount: number }> {
    const results: SyncResult[] = [];
    let failedCount = 0;

    for (const txData of transactions) {
      const clientId = txData.clientTransactionId || `offline-${Date.now()}`;
      try {
        const { transaction, isDuplicate } = await SalesService.checkout(txData, cashierId);
        results.push({
          clientTransactionId: clientId,
          serverInvoiceNumber: transaction.invoiceNumber,
          status: isDuplicate ? "DUPLICATE_IGNORED" : "SYNCED",
        });
      } catch (err: any) {
        failedCount++;
        results.push({
          clientTransactionId: clientId,
          status: "FAILED",
          error: err.message || "Failed to process offline transaction",
        });
      }
    }

    return {
      results,
      totalProcessed: transactions.length,
      failedCount,
    };
  }
}
