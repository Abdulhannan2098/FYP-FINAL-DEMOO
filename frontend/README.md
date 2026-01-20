markdown

# AutoSphere Frontend

React-based frontend for AutoSphere Car Accessories Marketplace

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or higher
- Backend API running on http://localhost:5000

### Installation

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```bash
cp .env.example .env
```

4. Update `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

5. Start development server:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## 🔐 Accounts

Create accounts through the Register page, then log in using your own credentials.

## 📦 Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── pages/          # Page components
│   ├── context/        # React Context
│   ├── services/       # API services
│   ├── App.jsx         # Main app component
│   └── index.jsx       # Entry point
├── public/             # Static assets
└── package.json        # Dependencies
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎨 Features

- JWT-based authentication
- Role-based dashboards (Customer, Vendor, Admin)
- Product browsing and filtering
- Order management
- Product approval workflow
- Responsive design with Tailwind CSS

````

---

## 🚀 Complete Setup Instructions

### Step 1: Initialize the Project

```bash
# Create project root directory
mkdir autosphere
cd autosphere

# Create backend and frontend directories
mkdir backend frontend
````

### Step 2: Setup Backend

```bash
cd backend

# Initialize npm
npm init -y

# Install dependencies
npm install express mongoose jsonwebtoken bcryptjs express-validator cors helmet morgan dotenv

# Install dev dependencies
npm install --save-dev nodemon

# Create all necessary files (copy content from above)
# Create folder structure
mkdir config models controllers routes middlewares utils seed

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Seed the database
npm run seed

# Start backend server
npm run dev
```

### Step 3: Setup Frontend

```bash
cd ../frontend

# Create Vite project
npm create vite@latest . -- --template react

# Install dependencies
npm install react-router-dom axios

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Create all necessary files (copy content from above)
# Create folder structure
mkdir -p src/components src/pages/dashboards src/context src/services

# Create .env file
cp .env.example .env
# Edit .env with backend API URL

# Start frontend server
npm run dev
```

### Step 4: Verify Installation

1. **Backend Check:**

   - Open http://localhost:5000/api/health
   - Should return: `{"success": true, "message": "AutoSphere API is running"}`

2. **Frontend Check:**

   - Open http://localhost:5173
   - Should see AutoSphere home page with products

3. **Test Login:**
   - Use test credentials from the seed data
   - Login should redirect to appropriate dashboard

---

## 📋 Testing Checklist

### Authentication Tests

- [ ] Register as new customer
- [ ] Register as new vendor
- [ ] Login with test accounts
- [ ] JWT token is stored in localStorage
- [ ] Logout clears token and redirects to login

### Customer Flow Tests

- [ ] Browse products on home page
- [ ] Filter products by category
- [ ] Search products by name
- [ ] View product details
- [ ] Access customer dashboard
- [ ] View order history

### Vendor Flow Tests

- [ ] Login as vendor
- [ ] Access vendor dashboard
- [ ] Create new product (goes to pending approval)
- [ ] View own products list
- [ ] View orders containing vendor's products
- [ ] Update order status
- [ ] Delete own product

### Admin Flow Tests

- [ ] Login as admin
- [ ] View all products
- [ ] Approve/reject pending products
- [ ] Delete any product
- [ ] View all orders
- [ ] Update any order status
- [ ] View dashboard statistics

### Security Tests

- [ ] Protected routes redirect unauthenticated users to login
- [ ] Role-based access control prevents unauthorized access
- [ ] Invalid JWT tokens are rejected
- [ ] Password validation enforces requirements

---

## 🔧 Configuration Notes

### MongoDB Connection

```javascript
// Local MongoDB
MONGODB_URI=mongodb://localhost:27017/autosphere_db

// MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autosphere_db
```

### JWT Secret

```bash
# Generate a secure random string for production
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### CORS Configuration

```javascript
// Backend allows requests from frontend
CORS_ORIGIN=http://localhost:5173

// For production, update to your domain
CORS_ORIGIN=https://yourdomain.com
```

---

## 🐛 Common Issues & Solutions

### Issue: MongoDB Connection Failed

**Solution:**

- Check if MongoDB is running: `mongosh`
- Verify connection string in `.env`
- Ensure network access if using MongoDB Atlas

### Issue: Port Already in Use

**Solution:**

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Issue: CORS Errors

**Solution:**

- Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
- Check if backend is running before frontend

### Issue: JWT Token Expired

**Solution:**

- Logout and login again
- Clear localStorage: `localStorage.clear()`

### Issue: Products Not Showing

**Solution:**

- Check if products are approved (admin action required)
- Verify backend API is accessible
- Check browser console for errors

---

## 📝 API Testing with cURL

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test@123",
    "role": "customer"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD"
  }'
```

### Get Products

```bash
curl http://localhost:5000/api/products
```

### Create Product (Vendor)

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "price": 99.99,
    "category": "Electronics",
    "stock": 10
  }'
```

### Approve Product (Admin)

```bash
curl -X PUT http://localhost:5000/api/products/PRODUCT_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{"isApproved": true}'
```

---

## 🎯 Next Steps (Future Phases)

This Phase-0 foundation is complete. Here are suggested next phases:

### Phase-1: Enhanced Features

- Image upload functionality
- Shopping cart system
- Complete checkout flow
- Email notifications
- Password reset functionality

### Phase-2: Advanced Features

- AR product visualization
- Online payment gateway integration
- Advanced search with filters
- Wishlist functionality
- Product reviews and ratings enhancement

### Phase-3: Business Features

- Vendor subscription plans
- Analytics dashboard
- Sales reports
- Inventory management
- Multi-vendor commission system

### Phase-4: Optimization

- Performance optimization
- SEO optimization
- PWA implementation
- Real-time notifications
- Advanced caching

---

## 📚 Technology Stack Summary

### Backend

- **Runtime:** Node.js v18+
- **Framework:** Express.js 4.18
- **Database:** MongoDB with Mongoose 7.0
- **Authentication:** JWT (jsonwebtoken 9.0)
- **Security:** bcryptjs, helmet, cors
- **Validation:** express-validator 7.0
- **Logging:** morgan

### Frontend

- **Framework:** React 18.2
- **Build Tool:** Vite 4.3
- **Routing:** React Router DOM 6.10
- **HTTP Client:** Axios 1.4
- **Styling:** Tailwind CSS 3.3
- **State Management:** React Context API

### Development Tools

- **Backend Dev Server:** nodemon
- **Frontend Dev Server:** Vite HMR
- **Package Manager:** npm

---

## 🔒 Security Best Practices Implemented

1. **Password Security**

   - Bcrypt hashing with salt rounds
   - Strong password validation (8+ chars, mixed case, numbers, special chars)
   - Passwords never stored in plain text

2. **JWT Authentication**

   - Secure token generation
   - Token expiration (7 days default)
   - Authorization header validation

3. **API Security**

   - Helmet for security headers
   - CORS configuration
   - Input validation on all routes
   - Role-based access control

4. **Data Validation**

   - express-validator for input sanitization
   - Mongoose schema validation
   - Type checking and constraints

5. **Error Handling**
   - Global error handler
   - No sensitive data in error messages
   - Proper HTTP status codes

---

## 📖 Database Schema Overview

### Users Collection

```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: Enum ['customer', 'vendor', 'admin'],
  phone: String,
  address: Object,
  isActive: Boolean,
  timestamps: true
}
```

### Products Collection

```javascript
{
  name: String,
  description: String,
  price: Number,
  category: Enum,
  stock: Number,
  vendor: ObjectId (ref: User),
  images: [String],
  isApproved: Boolean,
  rating: Number,
  numReviews: Number,
  timestamps: true
}
```

### Orders Collection

```javascript
{
  customer: ObjectId (ref: User),
  items: [{
    product: ObjectId (ref: Product),
    quantity: Number,
    price: Number
  }],
  shippingAddress: Object,
  paymentMethod: Enum ['COD'],
  totalAmount: Number,
  status: Enum,
  statusHistory: Array,
  timestamps: true
}
```

### Reviews Collection

```javascript
{
  product: ObjectId (ref: Product),
  customer: ObjectId (ref: User),
  rating: Number (1-5),
  comment: String,
  timestamps: true
}
```

---

## 🎓 Learning Resources

### MongoDB

- [MongoDB Official Docs](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)

### Express.js

- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### React

- [React Documentation](https://react.dev/)
- [React Router Documentation](https://reactrouter.com/)

### Tailwind CSS

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Tailwind Components](https://tailwindui.com/)

---

## 📞 Support & Contribution

### Getting Help

- Review this documentation thoroughly
- Check the troubleshooting section
- Verify all environment variables are set correctly
- Ensure both backend and frontend are running

### Code Structure

- Follow the established folder structure
- Maintain consistent naming conventions
- Add comments for complex logic
- Keep functions small and focused

### Git Workflow (Recommended)

```bash
# Initialize git
git init

# Add .gitignore files (already included)
# Create initial commit
git add .
git commit -m "Initial commit: Phase-0 AutoSphere foundation"

# Create development branch
git checkout -b develop
```

---

## ✅ Phase-0 Completion Criteria

**Backend:** ✓

- [x] Express server running on port 5000
- [x] MongoDB connection established
- [x] All models created (User, Product, Order, Review)
- [x] Authentication working (register, login, JWT)
- [x] All API endpoints functional
- [x] Role-based access control implemented
- [x] Database seeder working
- [x] Error handling and validation in place

**Frontend:** ✓

- [x] Vite dev server running on port 5173
- [x] React router configured
- [x] Authentication context working
- [x] All pages created (Login, Register, Home, Product Detail)
- [x] All dashboards created (Customer, Vendor, Admin)
- [x] Protected routes implemented
- [x] Tailwind CSS styling applied
- [x] API integration complete

**Documentation:** ✓

- [x] README files for backend and frontend
- [x] Setup instructions clear and complete
- [x] Test accounts documented
- [x] API endpoints documented
- [x] Troubleshooting guide included

---

## 🎉 Congratulations!

You now have a fully functional Phase-0 foundation for AutoSphere. The system includes:

✅ Complete authentication system with JWT
✅ Role-based access control (Customer, Vendor, Admin)
✅ Product management with approval workflow
✅ Order management with COD payment
✅ Review system
✅ Responsive UI with Tailwind CSS
✅ Clean, modular, and scalable code structure

**Ready for the next phase!**
