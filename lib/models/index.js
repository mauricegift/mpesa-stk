const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  MerchantRequestID: String,
  CheckoutRequestID: String,
  ResultCode: Number,
  ResultDesc: String,
  Amount: Number,
  MpesaReceiptNumber: String,
  TransactionDate: String,
  PhoneNumber: String,
  Status: { type: String, default: 'pending' },
  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
