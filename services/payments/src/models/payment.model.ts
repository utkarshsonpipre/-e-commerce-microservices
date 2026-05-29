import { Schema, model, HydratedDocument, InferSchemaType } from 'mongoose';

export const PAYMENT_STATUSES = ['pending', 'succeeded', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const paymentSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 }, // minor units
    currency: { type: String, default: 'usd' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
    provider: { type: String, default: 'stripe' },
    providerPaymentId: { type: String, required: true, index: true },
    clientSecret: { type: String, default: null },
    failureReason: { type: String, default: null },
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

export type Payment = InferSchemaType<typeof paymentSchema>;
export type PaymentDocument = HydratedDocument<Payment>;

export const PaymentModel = model('Payment', paymentSchema);
