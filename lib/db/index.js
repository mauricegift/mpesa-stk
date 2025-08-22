const mongoose = require('mongoose');
// mongoose.set('strictQuery', false);
const config = require('../config');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    
    console.log('Database Connected ✅');
    
    const db = mongoose.connection;
    
    db.on('error', (error) => {
      console.error('DB connection error:', error);
    });
    
    db.once('open', () => {
      console.log('DB connection established');
    });
    
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); // Exit process with failure
  }
};

module.exports = { connectDB }; 
