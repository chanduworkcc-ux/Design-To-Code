export type Language = "en" | "hi" | "te";

export const LANGUAGE_LABELS: Record<Language, { native: string; english: string; flag: string }> = {
  en: { native: "English", english: "English", flag: "🇬🇧" },
  hi: { native: "हिन्दी", english: "Hindi", flag: "🇮🇳" },
  te: { native: "తెలుగు", english: "Telugu", flag: "🇮🇳" },
};

const translations = {
  en: {
    // Nav tabs
    home: "Home", cart: "Cart", wishlist: "Wishlist", search: "Search", profile: "Profile",
    // Common
    back: "Back", save: "Save", cancel: "Cancel", ok: "OK", loading: "Loading...",
    error: "Error", success: "Success", remove: "Remove", close: "Close",
    viewAll: "View all →", comingSoon: "Coming Soon",
    // Home
    goodMorning: "Good Morning", goodAfternoon: "Good Afternoon",
    goodEvening: "Good Evening", goodNight: "Good Night",
    shopNow: "Shop Now", trending: "Trending Now", newArrivals: "New Arrivals",
    allProducts: "All Products", seeAll: "See All",
    addToCart: "Add to Cart", addedToCart: "Added!", inWishlist: "Wishlisted",
    outOfStock: "Out of Stock",
    // Cart
    yourCart: "Cart", checkout: "Proceed to Checkout",
    cartEmpty: "Your cart is empty", continueShopping: "Continue Shopping",
    orderSummary: "Order Summary", subtotal: "Subtotal", total: "Total",
    // Wishlist
    yourWishlist: "Wishlist", wishlistEmpty: "Your wishlist is empty",
    wishlistEmptySub: "Save items you love to your wishlist.",
    // Search
    searchPlaceholder: "Search products...", noResults: "No results found",
    noResultsSub: "Try a different keyword",
    popularSearches: "Popular Searches",
    // Profile sections
    wallet: "WALLET", account: "ACCOUNT", orders: "ORDERS",
    referrals: "REFERRALS", preferences: "PREFERENCES",
    security: "SECURITY", app: "APP", support: "SUPPORT", legal: "LEGAL",
    coinBalance: "Coin Balance",
    // Profile items
    personalInfo: "Personal Information", savedAddresses: "Saved Addresses",
    paymentMethods: "Payment Methods", orderHistory: "Order History",
    returnsRefunds: "Returns & Refunds", trackOrders: "Track Orders",
    myReferralNetwork: "My Referral Network", inviteEarn: "Invite & Earn",
    notifications: "Notifications", appearance: "Appearance",
    languageRegion: "Language & Region",
    changePassword: "Change Password", loginDevices: "Login Devices",
    accountSecurity: "Account Security", checkForUpdates: "Check for Updates",
    appVersion: "App Version", shareApp: "Share App",
    helpCenter: "Help Center", contactUs: "Contact Us", rateApp: "Rate the App",
    termsConditions: "Terms & Conditions", privacyPolicy: "Privacy Policy",
    generalPolicies: "General Policies",
    signOut: "Sign Out", adminPanel: "Admin Panel",
    // Language screen
    language: "Language", selectLanguage: "Select Language",
    languageHint: "Choose your preferred language. Changes take effect immediately across the entire app.",
    // Orders
    yourOrders: "Your Orders", noOrders: "No orders yet",
    orderStatus_pending: "Pending", orderStatus_confirmed: "Confirmed",
    orderStatus_shipped: "Shipped", orderStatus_delivered: "Delivered",
    orderStatus_cancelled: "Cancelled",
    // Auth
    signIn: "Sign In", signUp: "Sign Up", email: "Email", password: "Password",
    name: "Full Name", mobile: "Mobile Number", forgotPassword: "Forgot Password?",
    alreadyAccount: "Already have an account?", noAccount: "Don't have an account?",
    // Landing
    landingTagline: "Shop smarter. Live better.",
    getStarted: "Get Started", iHaveAccount: "I already have an account",
    fastDelivery: "Lightning-fast delivery",
    securePayments: "Secure & trusted payments",
    exclusiveDeals: "Exclusive deals every day",
  },
  hi: {
    // Nav tabs
    home: "होम", cart: "कार्ट", wishlist: "विशलिस्ट", search: "खोज", profile: "प्रोफाइल",
    // Common
    back: "वापस", save: "सहेजें", cancel: "रद्द करें", ok: "ठीक है", loading: "लोड हो रहा है...",
    error: "त्रुटि", success: "सफलता", remove: "हटाएं", close: "बंद करें",
    viewAll: "सभी देखें →", comingSoon: "जल्द आ रहा है",
    // Home
    goodMorning: "शुभ प्रभात", goodAfternoon: "शुभ दोपहर",
    goodEvening: "शुभ संध्या", goodNight: "शुभ रात्रि",
    shopNow: "अभी खरीदें", trending: "ट्रेंडिंग", newArrivals: "नए उत्पाद",
    allProducts: "सभी उत्पाद", seeAll: "सभी देखें",
    addToCart: "कार्ट में जोड़ें", addedToCart: "जोड़ा गया!", inWishlist: "विशलिस्ट में",
    outOfStock: "स्टॉक में नहीं",
    // Cart
    yourCart: "कार्ट", checkout: "चेकआउट करें",
    cartEmpty: "आपका कार्ट खाली है", continueShopping: "खरीदारी जारी रखें",
    orderSummary: "ऑर्डर सारांश", subtotal: "उप-योग", total: "कुल",
    // Wishlist
    yourWishlist: "विशलिस्ट", wishlistEmpty: "आपकी विशलिस्ट खाली है",
    wishlistEmptySub: "जो आइटम पसंद हों उन्हें विशलिस्ट में सहेजें।",
    // Search
    searchPlaceholder: "उत्पाद खोजें...", noResults: "कोई परिणाम नहीं मिला",
    noResultsSub: "अलग कीवर्ड आज़माएं",
    popularSearches: "लोकप्रिय खोजें",
    // Profile sections
    wallet: "वॉलेट", account: "खाता", orders: "ऑर्डर",
    referrals: "रेफरल", preferences: "प्राथमिकताएं",
    security: "सुरक्षा", app: "ऐप", support: "सहायता", legal: "कानूनी",
    coinBalance: "सिक्का बैलेंस",
    // Profile items
    personalInfo: "व्यक्तिगत जानकारी", savedAddresses: "सहेजे गए पते",
    paymentMethods: "भुगतान के तरीके", orderHistory: "ऑर्डर इतिहास",
    returnsRefunds: "वापसी और धनवापसी", trackOrders: "ऑर्डर ट्रैक करें",
    myReferralNetwork: "मेरा रेफरल नेटवर्क", inviteEarn: "आमंत्रित करें और कमाएं",
    notifications: "सूचनाएं", appearance: "स्वरूप",
    languageRegion: "भाषा और क्षेत्र",
    changePassword: "पासवर्ड बदलें", loginDevices: "लॉगिन डिवाइस",
    accountSecurity: "खाता सुरक्षा", checkForUpdates: "अपडेट जांचें",
    appVersion: "ऐप संस्करण", shareApp: "ऐप साझा करें",
    helpCenter: "सहायता केंद्र", contactUs: "संपर्क करें", rateApp: "ऐप रेट करें",
    termsConditions: "नियम और शर्तें", privacyPolicy: "गोपनीयता नीति",
    generalPolicies: "सामान्य नीतियां",
    signOut: "साइन आउट", adminPanel: "एडमिन पैनल",
    // Language screen
    language: "भाषा", selectLanguage: "भाषा चुनें",
    languageHint: "अपनी पसंदीदा भाषा चुनें। परिवर्तन पूरे ऐप में तुरंत लागू होते हैं।",
    // Orders
    yourOrders: "आपके ऑर्डर", noOrders: "अभी तक कोई ऑर्डर नहीं",
    orderStatus_pending: "लंबित", orderStatus_confirmed: "पुष्टि हुई",
    orderStatus_shipped: "भेजा गया", orderStatus_delivered: "वितरित",
    orderStatus_cancelled: "रद्द",
    // Auth
    signIn: "साइन इन", signUp: "साइन अप", email: "ईमेल", password: "पासवर्ड",
    name: "पूरा नाम", mobile: "मोबाइल नंबर", forgotPassword: "पासवर्ड भूल गए?",
    alreadyAccount: "पहले से खाता है?", noAccount: "खाता नहीं है?",
    // Landing
    landingTagline: "स्मार्ट खरीदारी करें। बेहतर जिएं।",
    getStarted: "शुरू करें", iHaveAccount: "मेरे पास पहले से खाता है",
    fastDelivery: "तेज़ डिलीवरी",
    securePayments: "सुरक्षित भुगतान",
    exclusiveDeals: "हर दिन एक्सक्लूसिव ऑफर",
  },
  te: {
    // Nav tabs
    home: "హోమ్", cart: "కార్ట్", wishlist: "విష్‌లిస్ట్", search: "వెతుకు", profile: "ప్రొఫైల్",
    // Common
    back: "వెనుకకు", save: "సేవ్ చేయండి", cancel: "రద్దు చేయండి", ok: "సరే", loading: "లోడ్ అవుతోంది...",
    error: "లోపం", success: "విజయం", remove: "తొలగించు", close: "మూసివేయండి",
    viewAll: "అన్నీ చూడండి →", comingSoon: "త్వరలో వస్తుంది",
    // Home
    goodMorning: "శుభోదయం", goodAfternoon: "శుభ మధ్యాహ్నం",
    goodEvening: "శుభ సాయంత్రం", goodNight: "శుభ రాత్రి",
    shopNow: "ఇప్పుడే కొనండి", trending: "ట్రెండింగ్", newArrivals: "కొత్త వస్తువులు",
    allProducts: "అన్ని ఉత్పత్తులు", seeAll: "అన్నీ చూడండి",
    addToCart: "కార్ట్‌కు జోడించండి", addedToCart: "జోడించారు!", inWishlist: "విష్‌లిస్ట్‌లో",
    outOfStock: "స్టాక్ లేదు",
    // Cart
    yourCart: "కార్ట్", checkout: "చెక్అవుట్ చేయండి",
    cartEmpty: "మీ కార్ట్ ఖాళీగా ఉంది", continueShopping: "షాపింగ్ కొనసాగించండి",
    orderSummary: "ఆర్డర్ సారాంశం", subtotal: "ఉప మొత్తం", total: "మొత్తం",
    // Wishlist
    yourWishlist: "విష్‌లిస్ట్", wishlistEmpty: "మీ విష్‌లిస్ట్ ఖాళీగా ఉంది",
    wishlistEmptySub: "మీకు నచ్చిన వస్తువులను విష్‌లిస్ట్‌లో సేవ్ చేయండి.",
    // Search
    searchPlaceholder: "ఉత్పత్తులు వెతుకండి...", noResults: "ఫలితాలు కనుగొనబడలేదు",
    noResultsSub: "వేరే కీవర్డ్ ప్రయత్నించండి",
    popularSearches: "జనాదరణ పొందిన శోధనలు",
    // Profile sections
    wallet: "వాలెట్", account: "ఖాతా", orders: "ఆర్డర్లు",
    referrals: "రెఫరల్స్", preferences: "ప్రాధాన్యతలు",
    security: "భద్రత", app: "యాప్", support: "సహాయం", legal: "చట్టపరమైన",
    coinBalance: "కాయిన్ బ్యాలెన్స్",
    // Profile items
    personalInfo: "వ్యక్తిగత సమాచారం", savedAddresses: "సేవ్ చేసిన చిరునామాలు",
    paymentMethods: "చెల్లింపు పద్ధతులు", orderHistory: "ఆర్డర్ చరిత్ర",
    returnsRefunds: "తిరిగి ఇవ్వడం & రీఫండ్", trackOrders: "ఆర్డర్‌లను ట్రాక్ చేయండి",
    myReferralNetwork: "నా రెఫరల్ నెట్‌వర్క్", inviteEarn: "ఆహ్వానించండి & సంపాదించండి",
    notifications: "నోటిఫికేషన్లు", appearance: "రూపం",
    languageRegion: "భాష & ప్రాంతం",
    changePassword: "పాస్‌వర్డ్ మార్చండి", loginDevices: "లాగిన్ పరికరాలు",
    accountSecurity: "ఖాతా భద్రత", checkForUpdates: "అప్‌డేట్‌లు తనిఖీ చేయండి",
    appVersion: "యాప్ వెర్షన్", shareApp: "యాప్ షేర్ చేయండి",
    helpCenter: "సహాయ కేంద్రం", contactUs: "మమ్మల్ని సంప్రదించండి", rateApp: "యాప్ రేట్ చేయండి",
    termsConditions: "నిబంధనలు & షరతులు", privacyPolicy: "గోపనీయతా విధానం",
    generalPolicies: "సాధారణ విధానాలు",
    signOut: "సైన్ అవుట్", adminPanel: "అడ్మిన్ పానెల్",
    // Language screen
    language: "భాష", selectLanguage: "భాష ఎంచుకోండి",
    languageHint: "మీకు నచ్చిన భాషను ఎంచుకోండి. మార్పులు వెంటనే యాప్ అంతటా అమలులోకి వస్తాయి.",
    // Orders
    yourOrders: "మీ ఆర్డర్లు", noOrders: "ఇంకా ఆర్డర్లు లేవు",
    orderStatus_pending: "పెండింగ్", orderStatus_confirmed: "నిర్ధారించబడింది",
    orderStatus_shipped: "పంపబడింది", orderStatus_delivered: "డెలివరీ అయింది",
    orderStatus_cancelled: "రద్దు చేయబడింది",
    // Auth
    signIn: "సైన్ ఇన్", signUp: "సైన్ అప్", email: "ఇమెయిల్", password: "పాస్‌వర్డ్",
    name: "పూర్తి పేరు", mobile: "మొబైల్ నంబర్", forgotPassword: "పాస్‌వర్డ్ మర్చిపోయారా?",
    alreadyAccount: "ఇప్పటికే ఖాతా ఉందా?", noAccount: "ఖాతా లేదా?",
    // Landing
    landingTagline: "తెలివిగా కొనండి. బాగా జీవించండి.",
    getStarted: "ప్రారంభించండి", iHaveAccount: "నాకు ఇప్పటికే ఖాతా ఉంది",
    fastDelivery: "వేగవంతమైన డెలివరీ",
    securePayments: "సురక్షిత చెల్లింపులు",
    exclusiveDeals: "ప్రతి రోజు ప్రత్యేక ఆఫర్లు",
  },
};

export type TranslationKey = keyof typeof translations.en;

export function t(lang: Language, key: TranslationKey): string {
  return (translations[lang] as any)[key] ?? translations.en[key] ?? key;
}

export default translations;
