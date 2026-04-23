const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const storyRoutes = require('./routes/story.routes');
const libraryRoutes = require('./routes/library.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const adminRoutes = require('./routes/admin.routes');
const pricingRoutes = require('./routes/pricing.routes');
const interactionRoutes = require('./routes/interaction.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Simple Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method !== 'GET') console.log('Body:', req.body);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/stories', storyRoutes);
app.use('/', libraryRoutes);
app.use('/purchase', purchaseRoutes);
app.use('/admin', adminRoutes);
app.use('/pricing', pricingRoutes);
app.use('/', interactionRoutes);

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

module.exports = app;
