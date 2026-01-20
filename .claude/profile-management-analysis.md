# Edit Profile & Account Management - Analysis Document

## Executive Summary

This document provides a complete analysis of the existing profile management functionality across the mobile app and backend, along with a detailed implementation plan for the web application.

---

## Phase 1: Analysis Findings

### 1. Backend Profile APIs

#### 1.1 User Model Schema

**File:** `backend/models/user.js`

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `name` | String | Required, max 50 chars | User's full name |
| `email` | String | Required, unique, regex validated | Authentication identifier |
| `password` | String | Min 8 chars, bcrypt hashed | User password |
| `phone` | String | Pakistan format: `03001234567` or `+923001234567` | Contact number |
| `address` | Object | Sub-fields: street, city, state, zipCode, country | Shipping address |
| `profileImage` | String | Optional | Uploaded image path `/uploads/profiles/...` |
| `avatar` | String | Optional | OAuth provider image URL |
| `role` | String | Enum: customer, vendor, admin | User role |
| `businessName` | String | Max 100 chars (vendor only) | Business name |
| `businessAddress` | Object | Sub-fields: street, city, state, zipCode, country | Business location |

#### 1.2 Profile Update Endpoint

**Endpoint:** `PUT /api/auth/profile`
**File:** `backend/controllers/authController.js` (Lines 803-911)

**Request Format:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `profileImage` | File | Image file (JPEG, JPG, PNG, WEBP), max 5MB |
| `name` | String | Full name |
| `phone` | String | Phone number |
| `address` | JSON String/Object | Address object |
| `businessName` | String | Business name (vendor only) |
| `businessAddress` | JSON String/Object | Business address (vendor only) |

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "customer|vendor",
    "phone": "...",
    "address": {...},
    "profileImage": "/uploads/profiles/...",
    "businessName": "...",
    "businessAddress": {...}
  }
}
```

**Image Storage:**
- Location: `uploads/profiles/`
- Naming: `profile-{userId}-{timestamp}.{ext}`
- Old images auto-deleted on update

#### 1.3 Change Password Endpoint

**Endpoint:** `PUT /api/auth/change-password`
**File:** `backend/controllers/authController.js` (Lines 916-974)

**Request:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Validation:**
- Current password must match
- New password must differ from current
- New password: min 8 chars, uppercase, lowercase, digit, special char

---

### 2. Mobile App Implementation

#### 2.1 Customer Edit Profile Screen

**File:** `mobile/src/screens/customer/EditProfileScreen.js`

**Editable Fields:**
- Name (required)
- Email (required, validated)
- Phone (optional, format validated)
- Address (street, city, state, zipCode, country)

**Form Validation:**
```javascript
// Name validation
if (!formData.name.trim()) → "Name is required"

// Email validation
if (!formData.email.trim()) → "Email is required"
if (!/\S+@\S+\.\S+/.test(email)) → "Email is invalid"

// Phone validation (optional)
if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) → "Phone number is invalid"
```

**Image Upload Flow:**
1. User taps "Change Photo"
2. `expo-image-picker` opens with `allowsEditing: true`, `aspect: [1, 1]`
3. User crops to square
4. FormData created with `profileImage` field
5. API call: `PUT /auth/profile`
6. Response updates `AuthContext` via `updateUser()`
7. Success alert shown

#### 2.2 Vendor Edit Profile Screen

**File:** `mobile/src/screens/vendor/EditVendorProfileScreen.js`

Nearly identical to customer screen with same validation rules.

#### 2.3 Change Password Screen

**File:** `mobile/src/screens/auth/ChangePasswordScreen.js`

**Fields:**
- Current Password
- New Password
- Confirm Password

**Validation:**
```javascript
// Password strength regex
!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(password)
// Requires: lowercase, uppercase, digit, special char, min 8 chars
```

---

### 3. Google OAuth Behavior

**File:** `backend/config/passport.js` (Lines 29-90)

**OAuth Flow:**
1. User clicks "Continue with Google"
2. Redirect to Google consent screen
3. Google returns profile data:
   - `displayName` → `name`
   - `emails[0].value` → `email` (normalized)
   - `photos[0].value` → `avatar`
4. User created/updated in database
5. JWT token generated
6. Redirect to `/auth/callback?token=...`

**Avatar vs ProfileImage Priority:**
1. `profileImage` (manually uploaded) - **Highest Priority**
2. `avatar` (OAuth provider URL) - **Fallback**
3. Initials - **Final Fallback**

**Image Priority Code (mobile):**
```javascript
// From mobile/src/utils/userAvatar.js
export const getUserAvatarUri = (user) => {
  if (!user) return null;
  if (user.profileImage) return getImageUrl(user.profileImage);
  if (user.avatar) return user.avatar;
  return null;
};
```

---

### 4. Web Application Current State

**Stack:**
- React 19.1.1
- React Router DOM 7.9.3
- Tailwind CSS 3.4.18
- Axios 1.12.2
- Lucide React (icons)

**Auth Context:** `frontend/src/context/AuthContext.jsx`
- Provides: `user`, `loading`, `login`, `register`, `verifyEmail`, `logout`, `isAuthenticated`
- Storage: `localStorage` (token, user JSON)
- **Missing:** `updateUser` method for profile updates

**Current Dashboard Pages:**
- `CustomerDashboard.jsx` - Orders management only
- `VendorDashboard.jsx` - Products and orders management
- **No profile management exists**

**Available Components:**
- `ImageCropModal.jsx` - For image cropping
- `LoadingSpinner.jsx` - Loading states
- `Toast.jsx` - Notifications via `useToast()`

**Existing Utilities:**
- `imageHelper.js` - `resolveImageUrl()` for backend images
- `currency.js` - `formatPKR()` for currency

---

## Phase 2: Implementation Plan

### 1. AuthContext Enhancement

Add `updateUser` method to sync profile updates:
```javascript
const updateUser = (updatedUser) => {
  localStorage.setItem('user', JSON.stringify(updatedUser));
  setUser(updatedUser);
};
```

### 2. New Routes

| Route | Component | Role |
|-------|-----------|------|
| `/account/profile` | `ProfileSettings.jsx` | Customer |
| `/account/password` | `ChangePassword.jsx` | Customer |
| `/dashboard/vendor/settings` | `VendorSettings.jsx` | Vendor |

### 3. Components to Create

#### 3.1 ProfileSettings.jsx (Customer & Vendor)
- Personal info section (name, email, phone)
- Address section (street, city, state, zip, country)
- Profile image upload with cropping
- Form validation matching mobile
- Toast notifications for feedback

#### 3.2 ChangePassword.jsx
- Current password field
- New password field with strength indicator
- Confirm password field
- Password visibility toggles
- Same validation as mobile

#### 3.3 ProfileImageUpload.jsx (Reusable)
- File input with drag-and-drop
- Image preview with cropping
- Upload progress indicator
- Cache invalidation on update

### 4. UI/UX Requirements

**Theme Consistency:**
- Dark theme with maroon red accents (`#B91C1C`)
- Surface colors: `#1E1E1E`, `#2A2A2A`
- Text colors: `#E8E8E8`, `#B3B3B3`, `#8A8A8A`

**Form Patterns:**
- Inline error messages (red text below input)
- Clear errors on input change
- Loading state on submit button
- Success toast on completion

**Image Handling:**
- Use `resolveImageUrl()` for backend images
- Handle OAuth avatar URLs (https://)
- Cache busting: `?t=${timestamp}` for updates

---

## Validation Checklist

- [ ] Customer edit profile works end-to-end
- [ ] Vendor edit profile works end-to-end
- [ ] Change password functionality works securely
- [ ] Address updates persist correctly
- [ ] Profile image reflects globally (Header, Dashboard)
- [ ] Google OAuth images load correctly
- [ ] Mobile functionality remains unaffected
- [ ] UI matches premium design expectations

---

## Technical Constraints

1. **No modification to:**
   - Existing mobile functionality
   - Authentication/authorization logic
   - Role handling or routing
   - Existing API schemas

2. **Backward compatibility:**
   - Reuse existing backend endpoints
   - Match mobile API contracts exactly
   - No breaking changes to stored data

3. **Production safety:**
   - Incremental, isolated changes
   - No new dependencies unless essential
   - Test with both customer and vendor roles

---

## File Structure for Implementation

```
frontend/src/
├── pages/
│   ├── account/
│   │   ├── ProfileSettings.jsx     # Customer profile settings
│   │   └── ChangePassword.jsx      # Password change page
│   └── dashboards/
│       └── VendorSettings.jsx      # Vendor profile settings
├── components/
│   └── profile/
│       ├── ProfileImageUpload.jsx  # Reusable image upload
│       └── AddressForm.jsx         # Reusable address form
└── context/
    └── AuthContext.jsx             # Add updateUser method
```

---

## Phase 2: Implementation Complete

### Files Created/Modified

#### New Files Created:
1. **`frontend/src/pages/account/ProfileSettings.jsx`**
   - Customer profile settings with profile image upload
   - Personal information form (name, phone)
   - Address management
   - Security tab with link to change password
   - Account information display

2. **`frontend/src/pages/account/ChangePassword.jsx`**
   - Password change functionality for all roles
   - Password strength indicators
   - OAuth user detection (disabled for OAuth users)
   - Confirmation and validation

3. **`frontend/src/pages/dashboards/VendorSettings.jsx`**
   - Vendor-specific settings page
   - Profile tab (same as customer)
   - Business tab (business name, business address)
   - Security tab

#### Modified Files:
1. **`frontend/src/context/AuthContext.jsx`**
   - Added `updateUser(updatedUser)` method
   - Added `refreshUser()` method

2. **`frontend/src/components/Header.jsx`**
   - Profile image display (profileImage > avatar > initials)
   - User dropdown menu with Account Settings link
   - Mobile menu profile section update

3. **`frontend/src/App.jsx`**
   - Added lazy imports for new pages
   - Added protected routes:
     - `/account/profile` - Customer profile settings
     - `/account/password` - Change password (all roles)
     - `/dashboard/vendor/settings` - Vendor settings

### Feature Parity with Mobile

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Edit name | ✅ | ✅ | Complete |
| Edit phone | ✅ | ✅ | Complete |
| Edit address | ✅ | ✅ | Complete |
| Profile image upload | ✅ | ✅ | Complete |
| Image cropping | ✅ | ✅ | Complete |
| Change password | ✅ | ✅ | Complete |
| Password validation | ✅ | ✅ | Complete |
| Business name (vendor) | ✅ | ✅ | Complete |
| Business address (vendor) | ✅ | ✅ | Complete |
| Google OAuth avatar | ✅ | ✅ | Complete |
| Image priority logic | ✅ | ✅ | Complete |
| Global image propagation | ✅ | ✅ | Complete |

### Navigation Flow

**Customer:**
- Header dropdown → Account Settings → `/account/profile`
- Profile Settings → Security tab → Change Password → `/account/password`

**Vendor:**
- Header dropdown → Account Settings → `/dashboard/vendor/settings`
- Vendor Settings → Security tab → Change Password → `/account/password`

### Technical Notes

1. **Image Cache Invalidation**: Uses timestamp query parameter (`?t=timestamp`) to force browser refresh after upload.

2. **State Propagation**: Uses AuthContext `updateUser()` method to sync changes across all components.

3. **API Compatibility**: All API calls match existing backend endpoints exactly.

4. **No Breaking Changes**: Existing functionality untouched.

---

*Document updated: Phase 2 Implementation Complete*
*All features implemented and ready for testing*
