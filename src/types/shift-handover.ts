export interface ShiftHandoverData {
  handoverAmount: number;
  handoverStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  handoverTo?: string;
  handoverManagerId?: string | null;
  handoverManagerName?: string | null;
  handoverAcceptedAt?: string | null;
  handoverNotes?: string | null;
  cashierNotes?: string | null;
  // Shortage / Misplaced Cash Settlement
  shortageSettlementStatus?: "UNSETTLED" | "SETTLED";
  shortageSettlementType?: "RECOVERED_FROM_CASHIER" | "ABSORBED_BY_STORE";
  shortageSettledBy?: string | null;
  shortageSettledAt?: string | null;
  shortageSettlementNotes?: string | null;
}

export function parseShiftHandover(notes: string | null | undefined): ShiftHandoverData | null {
  if (!notes) return null;
  try {
    const trimmed = notes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.handoverAmount === "number" || parsed.handoverStatus) {
        return {
          handoverAmount: typeof parsed.handoverAmount === "number" ? parsed.handoverAmount : 0,
          handoverStatus: parsed.handoverStatus || "ACCEPTED",
          handoverTo: parsed.handoverTo || "Manager",
          handoverManagerId: parsed.handoverManagerId || null,
          handoverManagerName: parsed.handoverManagerName || null,
          handoverAcceptedAt: parsed.handoverAcceptedAt || null,
          handoverNotes: parsed.handoverNotes || null,
          cashierNotes: parsed.cashierNotes || "",
          shortageSettlementStatus: parsed.shortageSettlementStatus || undefined,
          shortageSettlementType: parsed.shortageSettlementType || undefined,
          shortageSettledBy: parsed.shortageSettledBy || null,
          shortageSettledAt: parsed.shortageSettledAt || null,
          shortageSettlementNotes: parsed.shortageSettlementNotes || null,
        };
      }
    }
  } catch {
    // legacy plain string
  }
  return null;
}

export function formatShiftHandoverNotes(data: ShiftHandoverData): string {
  return JSON.stringify(data);
}
