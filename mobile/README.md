# AutoSphere Mobile App

React Native (Expo) mobile application for AutoSphere - A car accessories marketplace platform with Customer and Vendor roles.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Testing on Physical Device](#testing-on-physical-device)
- [Build for Production](#build-for-production)
- [Troubleshooting](#troubleshooting)

---

## Features

### Customer Features
- Browse and search car accessories by category
- View detailed product information with image galleries
- Add products to shopping cart
- Place orders with Cash on Delivery
- Track order status and history
- User profile management
- **Placeholder**: View products in AR (future implementation)
- **Placeholder**: Real-time chat with vendors (future implementation)

### Vendor Features
- Dashboard with key business metrics (Products, Orders, Revenue)
- Product management (Create, Update, Delete)
- Order management (Accept, Reject, Update Status)
- View pending and completed orders
- Business profile management
- **Placeholder**: Real-time chat with customers (future implementation)

### General Features
- JWT-based authentication
- Role-based navigation (Customer/Vendor)
- Secure token storage with AsyncStorage
- Offline cart persistence
- Pull-to-refresh on data screens
- Loading states and error handling
- Form validation

---

## Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Language**: JavaScript (ES6+)
- **Navigation**: React Navigation v6 (Stack + Bottom Tabs)
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **UI Components**: React Native Paper (optional styling)
- **Icons**: Expo Vector Icons (Ionicons)
- **Backend API**: Node.js + Express + MongoDB (existing)

---

## Project Structure

```
mobile/
├── src/
│   ├── api/                    # API services and configuration
│   │   ├── config.js          # API base URL and endpoints
│   │   ├── client.js          # Axios instance with interceptors
│   │   ├── authService.js     # Authentication API calls
│   │   ├── productService.js  # Product API calls
│   │   ├── orderService.js    # Order API calls
│   │   ├── chatService.js     # Chat API calls (placeholder)
│   │   └── socketService.js   # Socket.IO setup (placeholder)
│   │
│   ├── components/            # Reusable UI components
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── ProductCard.js
│   │   ├── OrderCard.js
│   │   ├── Loading.js
│   │   └── EmptyState.js
│   │
│   ├── context/               # React Context providers
│   │   ├── AuthContext.js     # Authentication state
│   │   └── CartContext.js     # Shopping cart state
│   │
│   ├── navigation/            # Navigation configuration
│   │   ├── RootNavigator.js   # Root navigation logic
│   │   ├── AuthNavigator.js   # Auth screens (Login, Register)
│   │   ├── CustomerNavigator.js # Customer tab navigation
│   │   └── VendorNavigator.js   # Vendor tab navigation
│   │
│   ├── screens/               # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── customer/
│   │   │   ├── HomeScreen.js
│   │   │   ├── ProductListScreen.js
│   │   │   ├── ProductDetailScreen.js
│   │   │   ├── CartScreen.js
│   │   │   ├── OrdersScreen.js
│   │   │   ├── ChatScreen.js
│   │   │   └── ProfileScreen.js
│   │   └── vendor/
│   │       ├── DashboardScreen.js
│   │       ├── VendorProductsScreen.js
│   │       ├── VendorOrdersScreen.js
│   │       ├── VendorChatScreen.js
│   │       └── VendorProfileScreen.js
│   │
│   └── utils/                 # Utility functions
│       ├── storage.js         # AsyncStorage helpers
│       └── formatters.js      # Data formatting utilities
│
├── assets/                    # Images, fonts, icons
├── App.js                     # Root component
├── app.json                   # Expo configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v16 or higher)
   - Download: https://nodejs.org/

2. **npm** or **yarn**
   - Comes with Node.js

3. **Expo Go App** on your mobile device
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

4. **Git** (optional, for version control)
   - Download: https://git-scm.com/

---

## Installation

### Step 1: Clone the repository (if not already done)

```bash
cd /path/to/FYP-Ecommerce/Ecommerce_store
```

### Step 2: Navigate to mobile folder

```bash
cd mobile
```

### Step 3: Install dependencies

```bash
npm install
```

**Note**: This may take a few minutes. If you encounter any errors, try:

```bash
npm install --legacy-peer-deps
```

---

## Configuration

### Step 1: Configure Backend API URL

The API base URL is configured in `app.json` under `extra.apiUrl`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.10.8:5000/api"
    }
  }
}
```

**Important**: Replace `192.168.10.8` with your actual local network IP address.

#### How to find your IP address:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" under your active network interface (en0 or wlan0)

**Alternative**: You can also use `localhost` or `127.0.0.1` if testing on the same device, but this won't work with Expo Go on a physical device.

### Step 2: Ensure Backend is Running

Make sure your AutoSphere backend server is running:

```bash
cd ../backend
npm run dev
```

The backend should be accessible at `http://YOUR_IP:5000`

---

## Running the App

### Start the Expo development server

```bash
npm start
```

This will open the Expo Developer Tools in your browser. You'll see a QR code.

### Options to run the app:

1. **Expo Go (Recommended for Phase-0)**
   - Open Expo Go app on your phone
   - Scan the QR code shown in the terminal/browser
   - iOS: Use Camera app to scan
   - Android: Use Expo Go app to scan

2. **iOS Simulator** (Mac only)
   ```bash
   npm run ios
   ```

3. **Android Emulator**
   ```bash
   npm run android
   ```

4. **Web Browser** (limited functionality)
   ```bash
   npm run web
   ```

---

## Testing on Physical Device

### For best results with Expo Go:

1. **Connect to same Wi-Fi network**
   - Ensure your phone and development computer are on the same Wi-Fi network

2. **Scan QR code**
   - Use Expo Go app to scan the QR code from terminal

3. **Wait for bundle to load**
   - First load may take a minute
   - Subsequent reloads will be faster

4. **Shake device for Developer Menu**
   - iOS: Shake device
   - Android: Shake device or press hardware menu button

---

## Test Accounts

Create accounts directly in the app, or use accounts you’ve created/seeded in your backend.

---

## Build for Production

### Android APK

```bash
npx eas build --platform android --profile preview
```

### iOS IPA

```bash
npx eas build --platform ios --profile preview
```

**Note**: You need to set up EAS (Expo Application Services) account first:
```bash
npm install -g eas-cli
eas login
eas build:configure
```

---

## Troubleshooting

### Issue: "Network request failed" or "Cannot connect to API"

**Solution:**
1. Check that backend server is running
2. Verify API URL in `app.json` matches your local IP
3. Ensure phone and computer are on the same Wi-Fi network
4. Disable any VPN or firewall blocking the connection
5. Try accessing `http://YOUR_IP:5000/api/health` in your phone's browser

### Issue: "Unable to resolve module" errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue: "Expo Go app crashes on startup"

**Solution:**
1. Update Expo Go app to latest version
2. Ensure Expo SDK version compatibility
3. Check for syntax errors in code
4. Restart Expo development server

### Issue: "AsyncStorage is not supported" in web

**Solution:**
AsyncStorage doesn't work in web browsers. Use physical device or emulator instead.

### Issue: Images not loading

**Solution:**
1. Check image URLs are correct
2. Ensure backend `/uploads` folder is accessible
3. Verify CORS settings in backend allow image requests

---

## Future Enhancements (Not in Phase-0)

- **AR Preview**: Implement 3D model viewing with AR
- **Real-time Chat**: Integrate Socket.IO for live messaging
- **Push Notifications**: Order updates and chat notifications
- **Online Payments**: Stripe or PayPal integration
- **Product Reviews**: Customer feedback system
- **Advanced Filters**: Price range, ratings, etc.
- **Wishlist**: Save favorite products
- **Multi-language Support**: Internationalization

---

## API Endpoints Reference

All endpoints are prefixed with your `API_BASE_URL` (e.g., `http://192.168.10.8:5000/api`)

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user profile

### Products
- `GET /products` - Get all approved products
- `GET /products/:id` - Get product by ID
- `GET /products/vendor` - Get vendor's products (vendor only)
- `POST /products` - Create product (vendor only)
- `PUT /products/:id` - Update product (vendor only)
- `DELETE /products/:id` - Delete product (vendor only)

### Orders
- `GET /orders/customer` - Get customer orders
- `GET /orders/vendor` - Get vendor orders
- `POST /orders` - Create order
- `PUT /orders/:id/status` - Update order status

### Chat (Placeholder)
- `GET /chat/conversations` - Get conversations
- `GET /chat/conversations/:id/messages` - Get messages
- `POST /chat/conversations/:id/messages` - Send message

---

## Contact & Support

For issues or questions:
- Check existing issues in the repository
- Create a new issue with detailed description
- Include screenshots and error messages

---

## License

This project is part of the AutoSphere ecosystem. All rights reserved.

---

**Happy coding!** 🚀
