// I'm using production urls since i always test my projects in production and not sandbox

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { determineTransactionStatus } = require('../utils/mpesaToken');
const { getAccessToken } = require('../utils/mpesaToken');
const Transaction = require('../models');
const config = require('../config');


router.post('/verify-transaction.php', async (req, res) => {
  console.log('Received verification request:', req.body);
  
  try {
    const { checkoutRequestId } = req.body;
    
    if (!checkoutRequestId) {
      console.error('CheckoutRequestID is required for verification');
      return res.status(400).json({ error: 'CheckoutRequestID is required' });
    }
    
    console.log('Verifying transaction with CheckoutRequestID:', checkoutRequestId);
    
    const transaction = await Transaction.findOne({ CheckoutRequestID: checkoutRequestId });
    
    if (transaction) {
      console.log('Transaction found in database:', transaction.Status);
      
      if (transaction.Status === 'completed' || transaction.Status === 'failed') {
        console.log('Transaction already finalized in database');
        return res.json({
          success: transaction.Status === 'completed',
          status: transaction.Status,
          data: {
            ResultCode: transaction.ResultCode,
            Amount: transaction.Amount,
            PhoneNumber: transaction.PhoneNumber,
            MpesaReceiptNumber: transaction.MpesaReceiptNumber,
            TransactionDate: transaction.TransactionDate,
            MerchantRequestID: transaction.MerchantRequestID,
            CheckoutRequestID: transaction.CheckoutRequestID,
            ResultDesc: transaction.ResultDesc
          }
        });
      }
    } else {
      console.log('Transaction not found in database');
    }
    
    // If not found or still pending, query M-Pesa
    console.log('Querying M-Pesa for transaction status');
    const token = await getAccessToken();
    const date = new Date();
    const timestamp =
      date.getFullYear() +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      ("0" + date.getDate()).slice(-2) +
      ("0" + date.getHours()).slice(-2) +
      ("0" + date.getMinutes()).slice(-2) +
      ("0" + date.getSeconds()).slice(-2);

    const stk_password = Buffer.from(config.shortCode + config.passkey + timestamp).toString("base64");

    const queryRequestBody = {
      BusinessShortCode: config.shortCode,
      Password: stk_password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    console.log('Sending query request to M-Pesa:', queryRequestBody);
    
    const response = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      queryRequestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    console.log('M-Pesa query response:', response.data);
    
    const resultCode = response.data.ResultCode;
    const resultDesc = response.data.ResultDesc;
    
    const status = determineTransactionStatus(resultCode, resultDesc);
    const success = status === 'completed';
    
    let updatedTransaction;
    if (transaction) {
      transaction.ResultCode = resultCode;
      transaction.ResultDesc = resultDesc;
      transaction.Status = status;
      transaction.UpdatedAt = new Date();
      updatedTransaction = await transaction.save();
    } else {
      // Create a new transaction record if not found
      updatedTransaction = new Transaction({
        MerchantRequestID: response.data.MerchantRequestID,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc: resultDesc,
        Status: status,
        UpdatedAt: new Date()
      });
      await updatedTransaction.save();
    }
    
    console.log('Transaction updated in database with status:', status);
    
    return res.json({
      success: success,
      status: status,
      data: {
            ResultCode: updatedTransaction.ResultCode,
            Amount: updatedTransaction.Amount,
            PhoneNumber: updatedTransaction.PhoneNumber,
            MpesaReceiptNumber: updatedTransaction.MpesaReceiptNumber,
            TransactionDate: updatedTransaction.TransactionDate,
            MerchantRequestID: updatedTransaction.MerchantRequestID,
            CheckoutRequestID: updatedTransaction.CheckoutRequestID,
            ResultDesc: updatedTransaction.ResultDesc
          }
    });
    
  } catch (error) {
    console.error('Error verifying transaction:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});


module.exports = router;
