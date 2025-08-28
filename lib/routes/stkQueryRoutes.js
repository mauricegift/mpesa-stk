// I'm using production urls since i always test my projects in production and not sandbox

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getAccessToken, determineTransactionStatus } = require('../utils/mpesaToken');
const Transaction = require('../models');
const config = require('../config');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.post('/verify-transaction.php', async (req, res) => {
  console.log('Received verification request:', req.body);
  
  try {
    const { checkoutRequestId } = req.body;
    
    if (!checkoutRequestId) {
      console.error('CheckoutRequestID is required for verification');
      return res.status(400).json({ error: 'CheckoutRequestID is required' });
    }
    
    console.log('Verifying transaction with CheckoutRequestID:', checkoutRequestId);
    
    let transaction = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second between retries
    
    while (retryCount < maxRetries && !transaction) {
      transaction = await Transaction.findOne({ CheckoutRequestID: checkoutRequestId });
      
      if (!transaction) {
        console.log(`Transaction not found in database (attempt ${retryCount + 1}/${maxRetries})`);
        retryCount++;
        if (retryCount < maxRetries) {
          await delay(retryDelay);
        }
      }
    }
    
    if (transaction) {
      console.log('Transaction found in database after', retryCount + 1, 'attempt(s):', transaction.Status);
      
      if (transaction.Status === 'completed' || 
          transaction.Status === 'failed' || 
          transaction.Status === 'cancelled' ||
          transaction.Status === 'failed_insufficient_funds' ||
          transaction.Status === 'timeout' ||
          transaction.Status === 'failed_invalid_input') {
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
      
      const now = new Date();
      const lastUpdate = new Date(transaction.UpdatedAt || transaction.CreatedAt);
      const timeDiffMs = now - lastUpdate;
      const timeDiffMinutes = timeDiffMs / (1000 * 60);

      if (timeDiffMinutes > 5) {
        console.log('Transaction has been pending for', timeDiffMinutes.toFixed(2), 'minutes, querying M-Pesa');
      } else {
        // Transaction is still pending and recently updated, return pending status
        console.log('Transaction is still pending in database');
        return res.json({
          success: false,
          status: 'pending',
          data: {
            CheckoutRequestID: checkoutRequestId,
            message: 'Transaction is still being processed'
          }
        });
      }
    } else {
      console.log('Transaction not found in database after', maxRetries, 'attempts');
    }
    
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
    const merchantRequestId = response.data.MerchantRequestID;
    
    const status = determineTransactionStatus(resultCode, resultDesc);
    const success = status === 'completed';
    
    const updateData = {
      ResultCode: resultCode,
      ResultDesc: resultDesc,
      Status: status,
      UpdatedAt: new Date(),
      MerchantRequestID: merchantRequestId || (transaction ? transaction.MerchantRequestID : undefined)
    };
    
    const updatedTransaction = await Transaction.findOneAndUpdate(
      { CheckoutRequestID: checkoutRequestId },
      { $set: updateData },
      { 
        new: true, 
        upsert: true, 
        runValidators: true,
        setDefaultsOnInsert: true 
      }
    );
    
    console.log('Transaction updated/created in database with status:', status);
    
    return res.json({
      success: success,
      status: status,
      data: {
        ResultCode: updatedTransaction.ResultCode,
        Amount: updatedTransaction.Amount,
        PhoneNumber: updatedTransaction.PhoneNumber,
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
    
    if (error.response?.data?.ResultCode === 1) {
      // Transaction not found in M-Pesa system
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found in M-Pesa system',
        status: 'pending'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

module.exports = router;
