import { CartDocument, CartModel } from '../models/cart.model';

export const cartService = {
  async get(userId: string): Promise<CartDocument> {
    const cart = await CartModel.findOne({ userId });
    return cart ?? (await CartModel.create({ userId, items: [] }));
  },

  /** Add an item, or set its quantity if it's already in the cart. */
  async addItem(userId: string, productId: string, quantity: number): Promise<CartDocument> {
    const cart = await this.get(userId);
    const existing = cart.items.find((i) => i.productId === productId);
    if (existing) {
      existing.quantity = quantity;
    } else {
      cart.items.push({ productId, quantity });
    }
    await cart.save();
    return cart;
  },

  async removeItem(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.get(userId);
    cart.set(
      'items',
      cart.items.filter((i) => i.productId !== productId),
    );
    await cart.save();
    return cart;
  },

  async clear(userId: string): Promise<void> {
    await CartModel.updateOne({ userId }, { $set: { items: [] } });
  },
};
