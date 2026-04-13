# Fix config-related crashes, add validation, and improve error handling

## 📌 Summary

This PR improves the stability and reliability of the bot by addressing multiple runtime crashes caused by missing or undefined configuration values.

The goal was to make the bot safer for both local development and production use without changing its intended behavior.

---

## 🚀 Improvements

- Added centralized config normalization and validation
- Prevented crashes caused by missing config values
- Improved error handling across commands (no more hard crashes)
- Added fallback embed colors when undefined

---

## ✅ Fixes

Resolved runtime errors in the following commands:

- `/faq`
- `/staff`
- `/loa`
- `/bonk`
- `/stats`
- `/apply`

---

## 🔧 Technical Changes

- Added safe guards for:
  - channel lookups
  - role lookups
  - resource usage
- Ensured arrays/objects are validated before use
- Prevented undefined values from breaking EmbedBuilder
- Improved logging for easier debugging

---

## 🧪 Testing

- Bot starts and logs in successfully
- Application commands register correctly
- PostgreSQL connection works with migrations
- All previously failing commands now execute without crashing

---

## ⚠️ Notes

- No features were removed or altered
- No IDs or sensitive values were hardcoded
- Changes are minimal and consistent with existing code style

---

## 🎯 Result

The bot is now:
- Stable for local development
- Safer in production environments
- Easier to debug and maintain

---

## 💡 Motivation

These changes were made while setting up the bot locally and identifying areas where missing configuration caused unexpected crashes. This PR ensures a smoother developer experience and more resilient runtime behavior.