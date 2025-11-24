const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Make session available to all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Import middleware
const { isAuthenticated } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const branchRoutes = require('./routes/branches');
const categoryRoutes = require('./routes/categories');
const jenisBarangRoutes = require('./routes/jenisBarang');
const supplierRoutes = require('./routes/suppliers');
const barangRoutes = require('./routes/barang');
const warehouseRoutes = require('./routes/warehouse');
const stockRoutes = require('./routes/stock');
const incomingRoutes = require('./routes/incoming');
const outgoingRoutes = require('./routes/outgoing');
const transferRoutes = require('./routes/transfer');
const opnameRoutes = require('./routes/opname');
const jamaahRoutes = require('./routes/jamaah');

// Public routes (no authentication required)
app.use('/', authRoutes);

// Protected routes (authentication required)
// Protected routes (authentication required)
app.use('/', isAuthenticated, dashboardRoutes);
app.use('/branches', isAuthenticated, branchRoutes);
app.use('/categories', isAuthenticated, categoryRoutes);
app.use('/jenis-barang', isAuthenticated, jenisBarangRoutes);
app.use('/suppliers', isAuthenticated, supplierRoutes);
app.use('/barang', isAuthenticated, barangRoutes);
app.use('/warehouse', isAuthenticated, warehouseRoutes);
app.use('/stock', isAuthenticated, stockRoutes);
app.use('/incoming', isAuthenticated, incomingRoutes);
app.use('/outgoing', isAuthenticated, outgoingRoutes);
app.use('/transfer', isAuthenticated, transferRoutes);
app.use('/opname', isAuthenticated, opnameRoutes);
app.use('/jamaah', isAuthenticated, jamaahRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
