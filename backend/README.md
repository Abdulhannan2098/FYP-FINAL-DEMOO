markdown

# AutoSphere Backend API

Backend API for AutoSphere - Car Accessories Marketplace

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or higher
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```bash
cp .env.example .env
```

4. Update `.env` with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/autosphere_db
JWT_SECRET=your_unique_secret_key_here
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

5. Seed the database with test data:

```bash
npm run seed
```

6. Start the development server:

```bash
npm run dev
```

The API will be running at `http://localhost:5000`

## 📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Vendor only)
- `PUT /api/products/:id` - Update product (Vendor/Admin)
- `DELETE /api/products/:id` - Delete product (Vendor/Admin)
- `PUT /api/products/:id/approve` - Approve product (Admin only)
- `GET /api/products/vendor/my-products` - Get vendor's products (Vendor only)

### Orders

- `POST /api/orders` - Create order (Customer only)
- `GET /api/orders/user` - Get customer orders (Customer only)
- `GET /api/orders/vendor` - Get vendor orders (Vendor only)
- `GET /api/orders` - Get all orders (Admin only)
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status (Vendor/Admin)

### Reviews

- `POST /api/reviews/:productId` - Create review (Customer only)
- `GET /api/reviews/:productId` - Get product reviews

## 🔐 Test Accounts

After running the seed script, use these credentials:

**Admin:**

- Email: `admin123@autosphere.com`
- Password: `Admin@123`

**Vendors:**

- Email: `ali.hammad@autosphere.pk` | Password: `Vendor@123`
- Email: `ahmad@autosphere.pk` | Password: `Vendor@123`

**Customers:**

- Email: `ayesha.khan@example.pk` | Password: `Customer@123`
- Email: `bilal.ahmed@example.pk` | Password: `Customer@123`

## 📦 Project Structure

```
backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middlewares/     # Custom middlewares
├── models/          # Mongoose models
├── routes/          # API routes
├── seed/            # Database seeder
├── utils/           # Utility functions
└── server.js        # Express app entry point
```

## 🛠️ Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with test data

## 🔒 Password Requirements

Passwords must be at least 8 characters and contain:

- One uppercase letter
- One lowercase letter
- One number
- One special character

Example: `Hannan@123`

````

---

## 📦 Frontend Implementation

### 1. Frontend Package.json

```json
{
  "name": "autosphere-frontend",
  "version": "1.0.0",
  "description": "AutoSphere Frontend - Car Accessories Marketplace",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.10.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.23",
    "tailwindcss": "^3.3.0",
    "vite": "^4.3.2"
  }
}
````
