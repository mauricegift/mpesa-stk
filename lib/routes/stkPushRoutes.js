// I'm using production urls since i always test my projects in production and not sandbox

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getAccessToken } = require('../utils/mpesaToken');
const Transaction = require('../models');
const config = require('../config');

router.post('/pay.php', async (req, res) => {
  console.log('Received payment request:', req.body);
  
  try {
    const { phoneNumber, amount } = req.body;
    
    if (!phoneNumber || !amount) {
      return res.status(400).json({ error: 'Phone number and amount are required' });
    }

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

    /*
for till number you can use
const requestBody = {
      BusinessShortCode: config.shortCode,
      Password: stk_password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: "4574518", // mpesa till number of the person to receive the funds(money). Can be personal/business till...doesn't matter
      PhoneNumber: phoneNumber,
      AccountReference: "Online Payment",
      TransactionDesc: "Payment for services",
      CallBackURL: config.callbackUrl
    };
*/


/*
for bank accounts one can use
const requestBody = {
      BusinessShortCode: config.shortCode,
      Password: stk_password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: "247247", // bank paybill number ie for equity bank is 247247, for kcb is 522522
      PhoneNumber: phoneNumber,
      AccountReference: "777xxxx", // Bank account number/bank till number where the money will be deposited 
      TransactionDesc: "Payment for services",
      CallBackURL: config.callbackUrl
    };
*/


/*
for safaricom/kopokopo paybill one can use
const requestBody = {
      BusinessShortCode: config.shortCode,
      Password: stk_password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: "paybill-num/shortcode", // your safaricom/kopokopo paybill(shortcode) number here
      PhoneNumber: phoneNumber,
      AccountReference: "acc-num", // your acc number here(can be optional)
      TransactionDesc: "Payment for services",
      CallBackURL: config.callbackUrl
    };
*/

    const requestBody = {
      BusinessShortCode: config.shortCode,
      Password: stk_password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: config.shortCode, // I'm usimg my default shortcode
      PhoneNumber: phoneNumber,
      AccountReference: `STK TEST FOR ${phoneNumber}`,
      TransactionDesc: "Payment for services",
      CallBackURL: config.callbackUrl
    };

    const response = await axios.post(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      requestBody,
      { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } }
    );
    
    if (!response.data.MerchantRequestID || !response.data.CheckoutRequestID) {
      return res.status(500).json({ success: false, error: 'Invalid response from payment gateway' });
    }
    
    const transaction = new Transaction({
      MerchantRequestID: response.data.MerchantRequestID,
      CheckoutRequestID: response.data.CheckoutRequestID,
      ResultCode: response.data.ResponseCode,
      ResultDesc: response.data.ResponseDescription,
      Amount: amount,
      PhoneNumber: phoneNumber,
      Status: 'pending'
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      message: 'STK push sent successfully',
      CheckoutRequestID: response.data.CheckoutRequestID,
      MerchantRequestID: response.data.MerchantRequestID,
      ResponseDescription: response.data.ResponseDescription
    });
    
  } catch (error) {
    console.error('Error in STK push:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

module.exports = router;
