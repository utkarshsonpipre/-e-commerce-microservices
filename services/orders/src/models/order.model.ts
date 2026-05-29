import { Schema, model, HydratedDocument, InferSchemaType } from 'mongoose';

export const ORDER_STATUSES = ['pending_payment', 'paid', 'failed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // minor units
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 }, // minor units
    currency: { type: String, default: 'usd' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment', index: true },
    paymentId: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export type Order = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<Order>;

export const OrderModel = model('Order', orderSchema);
