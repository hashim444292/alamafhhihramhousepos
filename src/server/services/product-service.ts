import db from "@/lib/db";
import { ProductInput } from "@/lib/validations/product";

export class ProductService {
  static async getAll(search?: string, categoryId?: string, lowStockOnly?: boolean) {
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    });

    if (lowStockOnly) {
      return products.filter((p) => p.stockQuantity <= p.minStockThreshold);
    }

    return products;
  }

  static async getById(id: string) {
    return db.product.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  static async getByBarcode(barcode: string) {
    return db.product.findUnique({
      where: { barcode },
      include: { category: true },
    });
  }

  static async create(data: ProductInput, userId: string) {
    return db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: data.sku,
          barcode: data.barcode,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          stockQuantity: data.stockQuantity,
          minStockThreshold: data.minStockThreshold,
          unit: data.unit,
          size: data.size,
          color: data.color,
          brand: data.brand,
          imageUrl: data.imageUrl,
          isActive: data.isActive,
        },
      });

      if (data.stockQuantity > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: "STOCK_IN_PO",
            quantity: data.stockQuantity,
            previousStock: 0,
            newStock: data.stockQuantity,
            referenceType: "INITIAL_ENTRY",
            notes: "Initial inventory setup",
            performedById: userId,
          },
        });
      }

      return product;
    });
  }

  static async update(id: string, data: Partial<ProductInput>) {
    return db.product.update({
      where: { id },
      data: {
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
        sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
        stockQuantity: data.stockQuantity !== undefined ? Number(data.stockQuantity) : undefined,
        minStockThreshold: data.minStockThreshold !== undefined ? Number(data.minStockThreshold) : undefined,
        unit: data.unit,
        size: data.size,
        color: data.color,
        brand: data.brand,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
      },
    });
  }

  static async delete(id: string) {
    const salesCount = await db.salesItem.count({ where: { productId: id } });
    if (salesCount > 0) {
      return db.product.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return db.product.delete({ where: { id } });
  }

  static async getCategories() {
    return db.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  static async createCategory(name: string, description?: string) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || `cat-${Date.now()}`;

    return db.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
      },
    });
  }

  static async updateCategory(id: string, name: string, description?: string) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || `cat-${Date.now()}`;

    return db.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug,
        description: description !== undefined ? description?.trim() || null : undefined,
      },
    });
  }

  static async deleteCategory(id: string) {
    const productCount = await db.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new Error(`Cannot delete this category because it contains ${productCount} products. Please reassign or delete the products first.`);
    }

    return db.category.delete({
      where: { id },
    });
  }
}
