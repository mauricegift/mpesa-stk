const express = require('express');
const router = express.Router();
const whiteListedIps = require("../utils/whiteListedIps"); // for security
const Transaction = require('../models');
const { determineTransactionStatus } = require('../utils/mpesaToken');

router.post('/callback.php', async (req, res) => {
  console.log('Received callback from M-Pesa:', JSON.stringify(req.body, null, 2));
  
  try {
    const ipAddress = req.connection.remoteAddress;
    if (!whiteListedIps.includes(ipAddress)) {
      return res.status(401).json("Forbidden! Ip Address not Allowed!");
    }
    
    const callbackData = req.body;
    if (callbackData.Body && callbackData.Body.stkCallback) {
      const stkCallback = callbackData.Body.stkCallback;
      const checkoutRequestId = stkCallback.CheckoutRequestID;
      
      const transaction = await Transaction.findOne({ CheckoutRequestID: checkoutRequestId });
      
      if (!transaction) {
        return res.status(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
      }
      
      const status = determineTransactionStatus(stkCallback.ResultCode, stkCallback.ResultDesc);
      
      transaction.ResultCode = stkCallback.ResultCode;
      transaction.ResultDesc = stkCallback.ResultDesc;
      transaction.Status = status;
      transaction.UpdatedAt = new Date();
      
      if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata && stkCallback.CallbackMetadata.Item) {
        const details = stkCallback.CallbackMetadata.Item.reduce((acc, item) => {
          acc[item.Name] = item.Value;
          return acc;
        }, {});

        transaction.Amount = details.Amount;
        transaction.MpesaReceiptNumber = details.MpesaReceiptNumber;
        transaction.TransactionDate = details.TransactionDate;
        transaction.PhoneNumber = details.PhoneNumber;
      }
      
      await transaction.save();
    }
    
    res.status(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
    
  } catch (error) {
    console.error('Error processing callback:', error.message);
    res.status(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

module.exports = router;
