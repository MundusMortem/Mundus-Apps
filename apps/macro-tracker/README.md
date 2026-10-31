# Macro Tracker — request #5

A device-local, multi-profile calorie and nutrient diary using the shared Mundus
Apps dark theme. Runtime is entirely client-side; no ChatGPT task or app backend
stores diet data. The public source repository contains code and test fixtures only.

## Log a food

Choose a calendar day and meal (Breakfast, Lunch, Dinner or Snack), then add a food.
Search general foods through USDA FoodData Central or packaged foods through Open
Food Facts. Barcode numbers, camera scanning and barcode photos use Open Food Facts.
Every imported food opens an editable review form before it can enter the diary.
Manual entry works without a network connection. Saved foods are available offline.

Nutrition can be entered per serving, per 100 grams or per 100 milliliters. Fractional
amounts are supported. A known serving weight enables serving/gram/mass-ounce
conversions; volume-based foods support milliliters and US fluid ounces. The app
never assumes a density to convert between mass and volume. Imported serving sizes
may be missing: enter the serving weight from the label when needed.

Net carbs are total carbs minus all recorded fiber and sugar alcohols, clamped at
zero. Calories retain the source/label value rather than being recomputed from
macros. Unknown nutrient values remain blank. When a deduction is unknown, net
carbs are explicitly marked as an estimate using zero for that missing deduction.
Daily totals identify incomplete values. Open Food Facts available-carbohydrate
values are normalized to total carbs using recorded fiber, preventing the fiber
from being deducted twice. Review the label when imported data is incomplete.

Other tracked nutrients include sugars, saturated fat, sodium, potassium, calcium,
iron, cholesterol, vitamin C and vitamin D. Daily goals are optional personal targets.
Entries keep their own food snapshots so later edits to a saved food cannot rewrite
past meals. Entries can be edited, deleted, or copied from the previous day.

## Local data and privacy

IndexedDB on the device stores profiles, foods, entries and goals. Nothing in the
app uploads this data to GitHub or another application server. Food lookup sends
only the user's search term or barcode to the chosen public food service. Camera
frames and barcode photos are decoded on the device; photos are not uploaded.
The decoder is bundled locally. Profiles on one browser are separate diaries,
not password-protected accounts. They do not automatically sync between devices.

Export JSON backups for all profiles or CSV for the current profile. Import validates
backups and adds new profile copies without deleting existing records. Clearing the
browser's site data removes local diaries. Private-browsing modes or storage limits
may prevent persistence; the app displays a warning and allows a session-only diary
that can be exported. Concurrent tab writes use a revision check instead of silently
overwriting newer data.

## Free APIs and source attribution

- [USDA FoodData Central API](https://fdc.nal.usda.gov/api-guide/) supplies general
  foods and portion information. Its public DEMO_KEY requires no signup, is not a
  private credential, and is limited to 30 requests/hour and 50/day per IP. Repeated
  requests in a page session are cached. If unavailable, search falls back to Open
  Food Facts. USDA data is public domain (CC0).
- [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/)
  supplies packaged food search and barcode lookup. Reads need no account. Searches
  run only on explicit submission, not each keystroke. Current documented limits
  are 10 searches/minute and 15 product reads/minute per IP. Source links are shown
  for imported foods. Its database is ODbL; see the in-app attribution.
- Nutrient units and carbohydrate interpretation follow the official
  [Open Food Facts product schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product/).

Public APIs can be unavailable or rate-limited, and contributed values may be
incomplete. Saved foods/manual logging remain usable in those conditions. A general
food result and a branded result can describe different preparation states: review
its name, serving size and label before logging.

## Barcode support

Native BarcodeDetector is preferred when available. The local ZXing browser bundle
provides camera and photo decoding otherwise. Camera access requires HTTPS (or
localhost), browser support and permission. Closing the scanner, hiding the page,
or leaving it stops tracks. Users can always type the barcode digits. This is food
barcode lookup, not OCR of a printed nutrition table.

## Develop and verify

Serve the repository root on localhost. The normal GitHub workflow installs pinned
Playwright 1.56.1, @zxing/browser 0.1.5 and @zxing/library 0.21.3, then runs
`node scripts/prepare_macro_vendor.mjs` to bundle the decoder and its licenses.
No third-party script is fetched at runtime.

Run `node --test tests/*.test.mjs` and, with the server running on port 8000,
`node tests/macro-browser.mjs`. `tests/macro-live.mjs` records live food API/CORS
checks separately so a transient provider outage does not break unrelated hourly
Reports deployments. `scripts/verify_macro.py` checks the published app runtime.
The app's manifest, service worker and caches are scoped to apps/macro-tracker/.
