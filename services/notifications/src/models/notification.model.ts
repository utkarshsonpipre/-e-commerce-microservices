import { Schema, model, HydratedDocument, InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    // The source event id — unique so a redelivered event can't send twice.
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    channel: { type: String, default: 'email' },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    relatedId: { type: String, default: null }, // e.g. orderId / userId
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
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

export type Notification = InferSchemaType<typeof notificationSchema>;
export type NotificationDocument = HydratedDocument<Notification>;

export const NotificationModel = model('Notification', notificationSchema);
