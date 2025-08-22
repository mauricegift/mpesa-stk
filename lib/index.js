const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { connectDB } = require('./db');
const config = require('./config');

// Import routes
const appRoutes = require('./routes/appRoutes');
const stkPushRoutes = require('./routes/stkPushRoutes');
const stkQueryRoutes = require('./routes/stkQueryRoutes');
const callbackRoutes = require('./routes/callBackRoutes');

const app = express();
app.use(express.json());
app.set('json spaces', 2);
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(bodyParser.json());

connectDB();

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Use routes

app.use('/api', appRoutes);
app.use('/api', stkPushRoutes);
app.use('/api', stkQueryRoutes);
app.use('/mpesa', callbackRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Callback URL: ${config.callbackUrl}`);
  console.log(`ShortCode: ${config.shortCode}`);
});

module.exports = app;
