import { createLogger } from '@ecommerce/common';
import { ProductModel } from './models/product.model';

const log = createLogger('catalog:seed');

// Prices are in minor units (cents). These give the storefront something to show.
const SAMPLE_PRODUCTS = [
  { name: 'Mechanical Keyboard', description: 'Hot-swappable, clicky brown switches', price: 7999, currency: 'usd', category: 'electronics', sku: 'KB-100', stock: 25 },
  { name: 'Wireless Mouse', description: 'Ergonomic, 8000 DPI, USB-C', price: 3499, currency: 'usd', category: 'electronics', sku: 'MS-200', stock: 40 },
  { name: '27" 4K Monitor', description: 'IPS, 144Hz, HDR400', price: 39999, currency: 'usd', category: 'electronics', sku: 'MON-300', stock: 12 },
  { name: 'Noise-Cancelling Headphones', description: 'Over-ear, 30h battery', price: 19999, currency: 'usd', category: 'audio', sku: 'HP-400', stock: 18 },
  { name: 'HD Webcam', description: '1080p60 with privacy shutter', price: 5999, currency: 'usd', category: 'electronics', sku: 'CAM-500', stock: 30 },
  { name: 'Desk Mat', description: 'Extra-large felt desk mat', price: 2499, currency: 'usd', category: 'accessories', sku: 'DM-600', stock: 50 },
];

/** Insert sample products if the catalog is empty (idempotent on restart). */
export async function seedProductsIfEmpty(): Promise<void> {
  const count = await ProductModel.countDocuments();
  if (count > 0) {
    log.info({ count }, 'Products already present — skipping seed');
    return;
  }
  await ProductModel.insertMany(SAMPLE_PRODUCTS);
  log.info({ inserted: SAMPLE_PRODUCTS.length }, 'Seeded sample products');
}
