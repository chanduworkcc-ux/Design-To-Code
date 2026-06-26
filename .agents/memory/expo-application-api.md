---
name: expo-application API names
description: Which expo-application properties/methods are safe to use synchronously
---

## Rule
Only `Application.applicationId` is a synchronous, non-deprecated property. `getIosIdForVendorAsync()` and `getAndroidId()` are async; `iosIdForVendorAsync` and `androidId` (the old synchronous forms) no longer exist in Expo SDK 53.

**Why:** Type errors like "Property 'androidId' does not exist" occur when using the deprecated names.

**How to apply:** For a quick device identifier, concatenate `applicationId + Date.now() + Math.random()` rather than calling async device-ID APIs.
