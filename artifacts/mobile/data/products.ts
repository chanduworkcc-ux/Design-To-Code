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
}

/** Fallback empty array — all products are loaded from the API */
export const products: Product[] = [];
