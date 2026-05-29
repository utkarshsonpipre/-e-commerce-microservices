import { ConflictError, NotFoundError } from '@ecommerce/common';
import { ProductDocument, ProductModel } from '../models/product.model';

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  category?: string;
  sku: string;
  stock?: number;
  active?: boolean;
}

export interface ListQuery {
  category?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface StockLine {
  productId: string;
  quantity: number;
}

/** A reserved line, enriched with the data orders needs to build the order. */
export interface ReservedLine {
  productId: string;
  name: string;
  unitPrice: number;
  currency: string;
  quantity: number;
}

export const catalogService = {
  async list(query: ListQuery) {
    const filter: Record<string, unknown> = { active: true };
    if (query.category) filter.category = query.category;
    if (query.q) filter.name = { $regex: query.q, $options: 'i' };

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      ProductModel.find(filter).skip(skip).limit(query.limit).sort({ createdAt: -1 }),
      ProductModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    };
  },

  async getById(id: string): Promise<ProductDocument> {
    const product = await ProductModel.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  },

  async create(input: ProductInput): Promise<ProductDocument> {
    const existing = await ProductModel.findOne({ sku: input.sku });
    if (existing) throw new ConflictError('A product with this SKU already exists');
    return ProductModel.create(input);
  },

  async update(id: string, input: Partial<ProductInput>): Promise<ProductDocument> {
    const product = await ProductModel.findByIdAndUpdate(id, input, { new: true });
    if (!product) throw new NotFoundError('Product not found');
    return product;
  },

  async remove(id: string): Promise<void> {
    const result = await ProductModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError('Product not found');
  },

  /**
   * Atomically reserve stock for a set of line items.
   *
   * A single MongoDB instance has no multi-document transactions, so we reserve
   * item-by-item with an atomic conditional `$inc`. If any line can't be
   * satisfied we compensate by releasing everything already reserved — a small
   * saga that leaves stock consistent on failure.
   */
  async reserveStock(lines: StockLine[]): Promise<ReservedLine[]> {
    const reserved: ReservedLine[] = [];
    try {
      for (const line of lines) {
        if (line.quantity <= 0) throw new ConflictError(`Invalid quantity for ${line.productId}`);
        const product = await ProductModel.findOneAndUpdate(
          { _id: line.productId, active: true, stock: { $gte: line.quantity } },
          { $inc: { stock: -line.quantity } },
          { new: true },
        );
        if (!product) {
          throw new ConflictError(`Insufficient stock for product ${line.productId}`);
        }
        reserved.push({
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          currency: product.currency,
          quantity: line.quantity,
        });
      }
      return reserved;
    } catch (err) {
      // Compensating action: undo the reservations we already made.
      await this.releaseStock(reserved.map((r) => ({ productId: r.productId, quantity: r.quantity })));
      throw err;
    }
  },

  /** Return reserved stock to inventory (e.g. when a payment fails). */
  async releaseStock(lines: StockLine[]): Promise<void> {
    await Promise.all(
      lines.map((line) =>
        ProductModel.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } }),
      ),
    );
  },
};
