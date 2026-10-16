import { z } from "zod";

export const OpenShiftSchema = z.object({
  openingCash: z.number().nonnegative("Opening cash float cannot be negative"),
  notes: z.string().optional(),
});

export const CloseShiftSchema = z.object({
  shiftId: z.string().min(1, "Shift ID is required"),
  closingCash: z.number().nonnegative("Actual physical cash count cannot be negative"),
  handoverCash: z.number().nonnegative("Handover cash cannot be negative").optional(),
  handoverTo: z.string().optional(),
  notes: z.string().optional(),
});

export const AcceptHandoverSchema = z.object({
  shiftId: z.string().min(1, "Shift ID is required"),
  action: z.enum(["ACCEPT", "REJECT"]).default("ACCEPT"),
  receivedAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type OpenShiftInput = z.infer<typeof OpenShiftSchema>;
export type CloseShiftInput = z.infer<typeof CloseShiftSchema>;
export type AcceptHandoverInput = z.infer<typeof AcceptHandoverSchema>;
