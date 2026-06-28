export type Category = "All" | "Clothing" | "Electronics" | "Books" | "Home" | "Beauty" | "Sports" | "Food" | "Other";

export interface Product {
  id: string;
  name: string;
  category: Exclude<Category, "All">;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  /** Local require() image — used when no imageUrl is available */
  image?: any;
  /** Remote URL — used for API products */
  imageUrl?: string | null;
  description?: string | null;
  stock?: number;
  isActive?: boolean;
  featured?: boolean;
  /** ISO timestamp from the DB — used to show a "New" badge for recent products */
  createdAt?: string | null;
  /** Admin-applied labels: "hot" | "trending" | "sale" | "premium" | "bestseller" | "limited" */
  tags?: string[];
}

export const PRODUCT_TAGS: { key: string; label: string; color: string; bg: string }[] = [
  { key: "hot",        label: "🔥 Hot",        color: "#EF4444", bg: "#FEF2F2" },
  { key: "trending",   label: "📈 Trending",   color: "#8B5CF6", bg: "#EDE9FE" },
  { key: "sale",       label: "💥 Sale",        color: "#F59E0B", bg: "#FFFBEB" },
  { key: "premium",    label: "💎 Premium",    color: "#2563EB", bg: "#EFF6FF" },
  { key: "bestseller", label: "⭐ Best Seller", color: "#D97706", bg: "#FEF3C7" },
  { key: "limited",    label: "⚡ Limited",    color: "#EC4899", bg: "#FDF2F8" },
];

/** Returns true if the product was added within the last 7 days */
export function isNewProduct(product: Product): boolean {
  if (!product.createdAt) return false;
  const added = new Date(product.createdAt).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return added >= sevenDaysAgo;
}

/** Fallback empty array — all products are loaded from the API */
export const products: Product[] = [];
