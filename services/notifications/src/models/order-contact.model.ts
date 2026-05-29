import { Schema, model } from 'mongoose';

/**
 * A tiny local read-model. Payment events don't carry the customer's email, so
 * when we process `order.created` we remember orderId → email here, then look
 * it up when payment events arrive. Each service keeps the data it needs.
 */
const orderContactSchema = new Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
});

export const OrderContactModel = model('OrderContact', orderContactSchema);
