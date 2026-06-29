import { db } from "@workspace/db";
import { systemConfigTable, usersTable, productsTable, bannersTable, faqsTable } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const DEFAULTS: Record<string, string> = {
  logo_url: "",
  coins_per_inr: "100",
  referral_coins: "100",
  referral_enabled: "true",
  delivery_charge: "40",
  tax_percent: "18",
  service_charge: "10",
  maintenance_charge: "5",
  razorpay_enabled: "false",
  razorpay_key_id: "",
  razorpay_key_secret: "",
  phonepe_enabled: "false",
  phonepe_merchant_id: "",
  phonepe_api_key: "",
  cod_enabled: "true",
  active_payment_gateway: "cod",
  login_enabled: "true",
  registration_enabled: "true",
  maintenance_mode: "false",
  maintenance_message: "We are performing scheduled maintenance. Please check back soon.",
  login_closed_message: "Logins are temporarily paused. Please try again later or contact support.",
  registration_closed_message: "New registrations are currently closed. Please check back soon.",
  store_status: "on",
  app_version: "1.0",
  min_app_version: "1.0.0",
  force_update: "false",
  update_url: "",
  update_version: "1.0.0",
  update_notes: "",
  rate_app_url: "",
  sms_enabled: "false",
  twilio_account_sid: "",
  twilio_auth_token: "",
  twilio_phone_number: "",
  referral_base_url: "",
};

export async function getConfig(key: string): Promise<string> {
  const rows = await db.select().from(systemConfigTable).where(eq(systemConfigTable.key, key));
  if (rows.length > 0) return rows[0].value;
  return DEFAULTS[key] ?? "";
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const rows = await db.select().from(systemConfigTable);
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await db
    .insert(systemConfigTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: systemConfigTable.key, set: { value, updatedAt: new Date() } });
}

export async function seedDefaultConfig(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await db
      .insert(systemConfigTable)
      .values({ key, value })
      .onConflictDoNothing();
  }
}

export async function seedAdminUser(): Promise<void> {
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "admin@xylocart.com"));

  if (existing.length > 0) return;

  const passwordHash = await bcrypt.hash("admin123", 12);
  await db.insert(usersTable).values({
    id: uuidv4(),
    email: "admin@xylocart.com",
    passwordHash,
    name: "Admin",
    deviceUuid: "admin-device-seed",
    referralCode: "ADMIN0",
    walletBalance: 0,
    role: "admin",
    status: "active",
  });
}

export async function seedDemoData(): Promise<void> {
  const [{ total }] = await db.select({ total: count() }).from(productsTable);
  if (total > 0) return;

  const now = new Date();
  const demoProducts = [
    {
      id: uuidv4(), name: "Wireless Earbuds Pro", category: "Electronics",
      price: 1999, originalPrice: 2999, discount: 33, rating: 4.5,
      description: "Premium wireless earbuds with active noise cancellation, 30-hour battery life, and crystal-clear sound.",
      imageUrl: "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=400&q=80",
      stock: 85, isActive: true, tags: ["new", "popular"],
    },
    {
      id: uuidv4(), name: "Smart Watch Series 7", category: "Electronics",
      price: 4999, originalPrice: 6999, discount: 28, rating: 4.7,
      description: "Feature-packed smartwatch with health monitoring, GPS tracking, and 7-day battery life.",
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
      stock: 42, isActive: true, tags: ["popular", "featured"],
    },
    {
      id: uuidv4(), name: "USB-C Laptop Stand", category: "Electronics",
      price: 899, originalPrice: 1299, discount: 30, rating: 4.3,
      description: "Ergonomic aluminum laptop stand with built-in USB-C hub, adjustable height, and cable management.",
      imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80",
      stock: 200, isActive: true, tags: ["sale"],
    },
    {
      id: uuidv4(), name: "Premium Cotton T-Shirt", category: "Clothing",
      price: 499, originalPrice: 799, discount: 37, rating: 4.2,
      description: "100% organic cotton t-shirt. Breathable, soft, and perfect for everyday wear. Available in 6 colors.",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
      stock: 300, isActive: true, tags: ["new"],
    },
    {
      id: uuidv4(), name: "Minimalist Leather Wallet", category: "Other",
      price: 699, originalPrice: 999, discount: 30, rating: 4.6,
      description: "Slim RFID-blocking leather wallet. Holds up to 10 cards and has a cash pocket.",
      imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80",
      stock: 150, isActive: true, tags: ["popular"],
    },
    {
      id: uuidv4(), name: "Scented Soy Candle Set", category: "Home",
      price: 599, originalPrice: 899, discount: 33, rating: 4.4,
      description: "Set of 3 hand-poured soy candles in calming fragrances: Lavender, Vanilla, and Sandalwood.",
      imageUrl: "https://images.unsplash.com/photo-1596079890744-c1a0462d0975?w=400&q=80",
      stock: 75, isActive: true, tags: ["featured"],
    },
    {
      id: uuidv4(), name: "Stainless Steel Water Bottle", category: "Sports",
      price: 799, originalPrice: 1199, discount: 33, rating: 4.8,
      description: "Double-wall vacuum insulated 1L bottle. Keeps drinks cold 24h and hot 12h. BPA-free.",
      imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80",
      stock: 180, isActive: true, tags: ["popular", "new"],
    },
    {
      id: uuidv4(), name: "Organic Green Tea (100g)", category: "Food",
      price: 349, originalPrice: 499, discount: 30, rating: 4.5,
      description: "Premium Darjeeling green tea. Rich in antioxidants, fresh aroma. Makes 50+ cups.",
      imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80",
      stock: 500, isActive: true, tags: ["sale"],
    },
  ];

  await db.insert(productsTable).values(demoProducts);

  const [{ bannerTotal }] = await db.select({ bannerTotal: count() }).from(bannersTable);
  if (bannerTotal > 0) return;

  const demoBanners = [
    {
      id: uuidv4(), title: "Summer Sale", subtitle: "Up to 40% off on Electronics & More",
      bgColor: "#1D4ED8", textColor: "#ffffff", ctaText: "Shop Now",
      imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80",
      isActive: true, sortOrder: 0,
      createdAt: now, updatedAt: now,
    },
    {
      id: uuidv4(), title: "New Arrivals", subtitle: "Fresh styles just dropped — check them out",
      bgColor: "#065F46", textColor: "#ffffff", ctaText: "Explore",
      imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
      isActive: true, sortOrder: 1,
      createdAt: now, updatedAt: now,
    },
    {
      id: uuidv4(), title: "Free Shipping", subtitle: "On all orders above ₹999 — no code needed",
      bgColor: "#7C3AED", textColor: "#ffffff", ctaText: "Start Shopping",
      imageUrl: null, isActive: true, sortOrder: 2,
      createdAt: now, updatedAt: now,
    },
  ];

  await db.insert(bannersTable).values(demoBanners);
}

export async function seedDefaultFaqs(): Promise<void> {
  const [{ total }] = await db.select({ total: count() }).from(faqsTable);
  if (total > 0) return;

  const now = new Date();
  const faqs = [
    // Orders
    { id: uuidv4(), category: "Orders", sortOrder: 10, question: "How do I place an order?", answer: 'Browse products, tap "Add to Cart", then go to your Cart and tap "Place Order". Choose your delivery address and payment method, then confirm. You\'ll get a confirmation notification once the order is placed.' },
    { id: uuidv4(), category: "Orders", sortOrder: 11, question: "Can I cancel my order?", answer: 'Yes, you can cancel an order before it is shipped. Go to Profile > My Orders, open the order, and tap "Cancel Order". Once shipped, cancellations are not possible, but you can raise a return request.' },
    { id: uuidv4(), category: "Orders", sortOrder: 12, question: "How do I track my order?", answer: "Go to Profile > My Orders and tap on your order. You'll see the current status (Confirmed, Processing, Shipped, Delivered). Tracking updates are shown in real time as the order progresses." },
    { id: uuidv4(), category: "Orders", sortOrder: 13, question: "What if I receive a wrong or damaged product?", answer: "We're sorry about that! Please raise a support ticket from Profile > Support within 48 hours of delivery, attach a photo, and our team will arrange a replacement or refund promptly." },

    // Payments
    { id: uuidv4(), category: "Payments", sortOrder: 20, question: "What payment methods are accepted?", answer: "We accept Cash on Delivery (COD), UPI, debit/credit cards, and net banking via our payment gateway. You can also use your XyloCart Wallet balance to pay for orders." },
    { id: uuidv4(), category: "Payments", sortOrder: 21, question: "Is it safe to pay on XyloCart?", answer: "Absolutely. All online payments are processed through a secure, encrypted payment gateway. We never store your card or UPI details on our servers." },
    { id: uuidv4(), category: "Payments", sortOrder: 22, question: "How does the Wallet work?", answer: "Your XyloCart Wallet is credited with coins from referrals and promotions. Coins can be redeemed at checkout to get discounts. Go to Profile > Wallet to see your balance and transaction history." },

    // Shipping
    { id: uuidv4(), category: "Shipping", sortOrder: 30, question: "How long does delivery take?", answer: "Standard delivery takes 3-7 business days depending on your location. Express delivery (where available) delivers within 1-2 business days. You can see the estimated delivery date on the product page." },
    { id: uuidv4(), category: "Shipping", sortOrder: 31, question: "Is there a delivery charge?", answer: "A small delivery fee applies per order. You can see the exact fee at checkout before placing your order. Occasionally we run free-shipping promotions -- keep an eye on the home page banners!" },

    // Returns & Refunds
    { id: uuidv4(), category: "Returns", sortOrder: 40, question: "What is your return policy?", answer: "We accept returns within 7 days of delivery for unused products in original packaging. Raise a return request via Profile > Support Tickets, and our team will guide you through the process." },
    { id: uuidv4(), category: "Returns", sortOrder: 41, question: "How long does a refund take?", answer: "Refunds are processed within 5-7 business days after the returned item is received and inspected. The amount is credited back to your original payment method or XyloCart Wallet." },

    // Account
    { id: uuidv4(), category: "Account", sortOrder: 50, question: "How do I refer a friend and earn rewards?", answer: "Go to Profile > Refer & Earn to find your unique referral link. Share it with friends -- when they sign up and place their first order, both of you earn XyloCart Wallet coins automatically!" },
    { id: uuidv4(), category: "Account", sortOrder: 51, question: "How do I reset my password?", answer: 'On the Login screen tap "Forgot Password", enter your registered email, and you\'ll receive a password reset link. Follow the link to set a new password. If you face issues, contact us via Support Tickets.' },
    { id: uuidv4(), category: "Account", sortOrder: 52, question: "How do I contact customer support?", answer: 'Go to Profile > Support Tickets and tap "New Ticket". Describe your issue and our team will respond within 24 hours. For urgent matters you can also search the Q&A section for quick answers.' },
  ];

  await db.insert(faqsTable).values(faqs.map((f) => ({ ...f, createdAt: now, updatedAt: now })));
}
