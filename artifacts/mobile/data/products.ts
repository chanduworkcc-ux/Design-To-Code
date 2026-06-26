export type Category = "All" | "Clothing" | "Electronics" | "Books" | "Home" | "Beauty" | "Sports" | "Food" | "Other";

export interface Product {
  id: string;
  name: string;
  category: Exclude<Category, "All">;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  /** Local require() image — used for static/seed products */
  image?: any;
  /** Remote URL — used for API products */
  imageUrl?: string | null;
  description?: string | null;
  stock?: number;
  isActive?: boolean;
  featured?: boolean;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Classic Linen Shirt",
    category: "Clothing",
    price: 3999,
    originalPrice: 6499,
    discount: 38,
    rating: 4.7,
    image: require("../assets/images/shirt.png"),
    featured: true,
  },
  {
    id: "2",
    name: "Wireless Earbuds Pro",
    category: "Electronics",
    price: 7499,
    rating: 4.5,
    image: require("../assets/images/earbuds.png"),
    featured: true,
  },
  {
    id: "3",
    name: "Atomic Habits",
    category: "Books",
    price: 399,
    rating: 4.9,
    image: require("../assets/images/book.png"),
    featured: true,
  },
  {
    id: "4",
    name: "Smart Watch Series X",
    category: "Electronics",
    price: 19999,
    originalPrice: 24999,
    discount: 17,
    rating: 4.6,
    image: require("../assets/images/smartwatch.png"),
  },
  {
    id: "5",
    name: "Yoga Mat Premium",
    category: "Home",
    price: 2499,
    rating: 4.3,
    image: require("../assets/images/yogamat.png"),
  },
  {
    id: "6",
    name: "Dark Chocolate Premium",
    category: "Beauty",
    price: 899,
    rating: 4.8,
    image: require("../assets/images/chocolate.png"),
  },
];

export const categories: Category[] = ["All", "Clothing", "Electronics", "Books", "Home", "Beauty", "Sports", "Food", "Other"];
