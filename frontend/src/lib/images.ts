import type { Product } from '../api';

// Curated product images keyed by SKU (the seeded catalog), with category and
// picsum fallbacks so nothing ever renders broken.
const SKU_IMAGES: Record<string, string> = {
  'KB-100': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700&q=80',
  'MS-200': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700&q=80',
  'MON-300': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700&q=80',
  'HP-400': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=80',
  'CAM-500': 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=700&q=80',
  'DM-600': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&q=80',
};

const CATEGORY_IMAGES: Record<string, string> = {
  electronics: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&q=80',
  audio: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=700&q=80',
  accessories: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=700&q=80',
};

export function fallbackImage(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/700/500`;
}

export function imageFor(product: Pick<Product, 'id' | 'sku' | 'category'> & { image?: string }): string {
  return (
    product.image ||
    SKU_IMAGES[product.sku] ||
    CATEGORY_IMAGES[product.category] ||
    fallbackImage(product.sku || product.id)
  );
}
