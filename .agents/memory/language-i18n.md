---
name: Language i18n system
description: How the multi-language system (English/Hindi/Telugu) is implemented in the mobile app
---

# Language i18n System

## Architecture
- `lib/i18n.ts` — all translation strings for 3 languages (en/hi/te), `t(lang, key)` helper, `LANGUAGE_LABELS` map, `Language` and `TranslationKey` types
- `context/LanguageContext.tsx` — LanguageProvider wrapping app, `useLanguage()` hook returning `{ language, setLanguage, t }`
- `app/language.tsx` — language picker screen (radio button UI matching appearance.tsx pattern), navigated from profile
- AsyncStorage key: `"app_language"` (persists selection)

## Provider nesting in _layout.tsx
`AppProvider > LanguageProvider > SocketInit > ...`

## Usage pattern
```tsx
const { t, language } = useLanguage();
<Text>{t("profile")}</Text>
// Show current language name:
LANGUAGE_LABELS[language].native
```

## Files that use translations
- `app/(tabs)/_layout.tsx` — tab bar labels (TAB_KEY_MAP: index→home, etc.)
- `app/(tabs)/index.tsx` — greeting, search placeholder, section headers (trending/newArrivals/allProducts/shopNow)
- `app/(tabs)/profile.tsx` — all section labels and menu item labels; language button value shows native name
- `app/(tabs)/cart.tsx` — cart title
- `app/(tabs)/wishlist.tsx` — wishlist title + empty state
- `app/(tabs)/search.tsx` — title, placeholder, section labels

## Currency button
Permanently removed from profile.tsx (the dollar-sign MenuItem and its divider are gone).

**Why:** User explicitly requested removal; currency is fixed at INR (₹).
