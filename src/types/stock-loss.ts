export interface StockLossSettlementData {
  reason?: string;
  settlementStatus?: "UNSETTLED" | "SETTLED";
  settlementType?: "RECOVERED_FROM_STAFF" | "ABSORBED_BY_STORE";
  settledBy?: string | null;
  settledAt?: string | null;
  settlementNotes?: string | null;
}

export function parseStockLossNotes(notes: string | null | undefined): StockLossSettlementData {
  if (!notes) return { settlementStatus: "UNSETTLED", reason: "" };
  try {
    const trimmed = notes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      return {
        reason: parsed.reason || "",
        settlementStatus: parsed.settlementStatus || "UNSETTLED",
        settlementType: parsed.settlementType || undefined,
        settledBy: parsed.settledBy || null,
        settledAt: parsed.settledAt || null,
        settlementNotes: parsed.settlementNotes || null,
      };
    }
  } catch {
    // plain string note
  }
  return {
    reason: notes,
    settlementStatus: "UNSETTLED",
  };
}

export function formatStockLossNotes(data: StockLossSettlementData): string {
  return JSON.stringify(data);
}
