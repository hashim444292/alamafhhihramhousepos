import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "../lib/db";
import { ProductService } from "./services/product-service";
import { SalesService } from "./services/sales-service";
import { InventoryService } from "./services/inventory-service";
import { ExpenseService } from "./services/expense-service";
import { ShiftService } from "./services/shift-service";
import { ReportsService } from "./services/reports-service";
import { SyncService } from "./services/sync-service";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-32-chars-long";

// -------------------------------------------------------------
// Express JWT & RBAC Middleware
// -------------------------------------------------------------
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: "ADMIN" | "MANAGER" | "CASHIER";
  };
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authentication token required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Forbidden: Insufficient privileges" });
    }
    next();
  };
}

// -------------------------------------------------------------
// Routes
// -------------------------------------------------------------

// Products
app.get("/api/products", async (req, res) => {
  try {
    const { search, categoryId, lowStock } = req.query;
    const products = await ProductService.getAll(
      search as string,
      categoryId as string,
      lowStock === "true"
    );
    const categories = await ProductService.getCategories();
    res.json({ success: true, products, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POS Checkout
app.post("/api/pos/checkout", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const result = await SalesService.checkout(req.body, req.user!.id);
    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Shifts & Z-Report
app.get("/api/pos/shifts/current", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const activeShift = await ShiftService.getCurrentShift(req.user!.id);
    res.json({ success: true, activeShift });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/pos/shifts/close", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const result = await ShiftService.closeShift(req.body, req.user!.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Offline Sync
app.post("/api/pos/sync", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const result = await SyncService.processBatch(req.body.transactions, req.user!.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Expenses
app.post("/api/expenses", authenticateJWT, requireRole(["ADMIN", "MANAGER"]), async (req: AuthRequest, res) => {
  try {
    const expense = await ExpenseService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, expense });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Financial Dashboard
app.get("/api/reports/dashboard", authenticateJWT, requireRole(["ADMIN", "MANAGER"]), async (_req, res) => {
  try {
    const metrics = await ReportsService.getDashboardMetrics();
    res.json({ success: true, metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
