# Changelog

## 2026-08-20 — Backend integration: people/profile flow

### `src/services/api.js`

- Switched the axios interceptor from `Authorization: Bearer <token>` to a `Cookie: token=<token>` header to match the backend's cookie-based auth (`isUserLoggedIn` / `whoIsUser` read `req.headers.cookie`).

### `src/services/personService.js` (new)

- `getMyProfile()` → `GET /api/auth/profile` (returns joined user+person; null fields are filtered out, so a missing `first_name` means no personal info yet).
- `hasPersonalInfo(profile)` → true when `first_name` is present.
- `createPerson(details)` → `POST /api/people`.

### `src/app/(auth)/login.jsx`

- After a successful login (token saved), the app fetches the profile:
  - profile exists → `router.replace("/")` (main app)
  - no profile → `router.replace("/personal-info")` (onboarding)
  - profile check fails → falls back to the main app (never blocks login).

### `src/app/(auth)/personal-info.jsx`

- **Street** is now optional to match the API validator (`body('street').optional({ checkFalsy: true })`).
- Continue now opens a **confirmation modal** summarizing the entered data (name, gender, age, disabilities, address, house floors, pets).
- "Confirm & Save" → `POST /api/people` with exactly the API-supported fields, then routes to the main app.
- Payload omits empty optionals (`middle_name`, `street`, `disabilities`); `gender` restricted to `male|female|other` by the API.
- Errors: 400 validation messages, 401 session-expired, 5xx/network fallbacks shown inside the modal.

### `src/components/ui/ConfirmModal.jsx` (new)

- Reusable transparent confirmation modal (title, subtitle, summary rows, Edit/Confirm actions, loading + error states).

### Notes / limitations (backend not changed)

- `house_floors` and `pets` are **not in the backend** (no columns, validators, or service fields in any branch) → they are still collected in the UI but **excluded from the POST payload** until the backend supports them.
- `gender_other` / `disability_other` specify fields are UI-only; the API only accepts `male|female|other` and string arrays for disabilities.
- Backend auth is cookie-based; on web the `Cookie` header is restricted by browsers (mobile-first).

---

## 2026-08-20 — UI/UX pass across all screens

### Shared

- **`src/components/ui/FormInput.jsx`** — upgraded the shared input component:
  - Focus state: primary-red border ring while the input is focused.
  - Error state: red border + inline error message below the field (takes priority over the helper).
  - `helper` prop: muted caption (e.g. register's phone helper) shown when there is no error.
  - `prefix` prop: reuses the `+63` phone prefix pattern (icon + code box).
  - `accessory` prop: right-side action slot (e.g. password visibility toggle).
  - `inputRef` forwarding for keyboard focus chaining.

### `src/app/(auth)/register.jsx`

- Refactored to use the shared `FormInput`.
- Client-side validation now flags each invalid field individually (red border + message under the field) instead of a single message.
- Errors clear live as the user types.
- Summary error text is now reserved for server/API failures.
- Username → password focus chaining via the keyboard (`returnKeyType="next"` / `"done"`), submit on Done.
- Password manager autofill hints (`autoComplete="username" / "tel" / "new-password"`).
- Removed duplicated inline input styles (now owned by `FormInput`).

### `src/app/(auth)/login.jsx`

- Same treatment as register: per-field validation with red highlighting, live error clearing, focus chaining (phone → password), Done key submits, autofill hints (`tel`, `current-password`).
- Summary error text reserved for server/API failures.

### `src/app/(auth)/personal-info.jsx`

- Validation on **Continue** now highlights every invalid required field at once (red border + message under each input).
- Gender selector: unselected chips get a red border when Gender is missing, with an inline message.
- Age and House Floors get "Enter a valid age / number of floors" messages when non-numeric.
- Errors clear live as the user edits a field.
- Removed the single bottom error message in favor of inline field errors.
- Optional fields (`Middle Name`, `Disabilities`, `Pets`, specify inputs) are never flagged.

---

## 2026-08-20 — Vector icons migration

- Removed the custom hand-drawn `src/components/ui/icons.jsx` (deleted).
- `login.jsx`, `register.jsx`, and `personal-info.jsx` now use `@expo/vector-icons` (`MaterialIcons`), verified against the installed glyphmap.
- Installed `@expo/vector-icons@15.1.1` and removed the accidental `vector-icons` package.

---

## 2026-08-20 — Personal Information screen (initial)

- Created `src/app/(auth)/personal-info.jsx` (onboarding screen after Registration) and the shared `src/components/ui/FormInput.jsx`.
- Fields: first/middle/last name, gender, age, disabilities multi-select, city/barangay/street/address, house floors, pets (optional, with stepper).
- UI-only at the time; design tokens reused from `src/constants/colors.js`; no backend calls.