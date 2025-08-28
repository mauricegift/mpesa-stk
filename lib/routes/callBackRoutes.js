const express = require('express');
const router = express.Router();
const whiteListedIps = require("../utils/whiteListedIps");
const Transaction = require('../models');
const { determineTransactionStatus } = require('../utils/mpesaToken');

router.post('/callback.php', async (req, res) => {
  console.log('Received callback from M-Pesa:', JSON.stringify(req.body, null, 2));
  
  try {
      const ipAddress = req.connection.remoteAddress || req.socket.remoteAddress;
      if (!whiteListedIps.includes(ipAddress)) {
       console.log(`Unauthorized IP attempt: ${ipAddress}`);
       return res.status(401).json("Forbidden! Ip Address not Allowed!");
     }
    
    const callbackData = req.body;
    if (!callbackData.Body || !callbackData.Body.stkCallback) {
      console.log('Invalid callback format');
      return res.status(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    
    const stkCallback = callbackData.Body.stkCallback;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc || "";
    
    if (!checkoutRequestId) {
      console.log('Missing CheckoutRequestID in callback');
      return res.status(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    
    console.log(`Processing callback for CheckoutRequestID: ${checkoutRequestId}, ResultCode: ${resultCode}`);
    
    const existingTransaction = await Transaction.findOne({ CheckoutRequestID: checkoutRequestId });
    
    if (!existingTransaction) {
      console.log(`Transaction not found for CheckoutRequestID: ${checkoutRequestId}`);
      
      try {
        const newTransactionData = {
          CheckoutRequestID: checkoutRequestId,
          MerchantRequestID: stkCallback.MerchantRequestID,
          ResultCode: resultCode,
          ResultDesc: resultDesc,
          Status: determineTransactionStatus(resultCode, resultDesc),
          UpdatedAt: new Date(),
          CreatedAt: new Date()
        };
        
        if (resultCode === 0 && stkCallback.CallbackMetadata && stkCallback.CallbackMetadata.Item) {
          const details = stkCallback.CallbackMetadata.Item.reduce((acc, item) => {
            if (item.Value !== undefined && item.Value !== null) {
              acc[item.Name] = item.Value;
            }
            return acc;
          }, {});

          newTransactionData.Amount = details.Amount;
          newTransactionData.MpesaReceiptNumber = details.MpesaReceiptNumber;
          newTransactionData.TransactionDate = details.TransactionDate ? details.TransactionDate.toString() : undefined;
          newTransactionData.PhoneNumber = details.PhoneNumber ? details.PhoneNumber.toString() : undefined;
        }
        
        await Transaction.create(newTransactionData);
        console.log(`Created new transaction record for CheckoutRequestID: ${checkoutRequestId}`);
      } catch (createError) {
        console.error('Error creating transaction record from callback:', createError.message);
      }
      
      return res.status(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    
    let status;
    if (resultCode === 0) {
      status = "completed";
    } else {
      const lowerResultDesc = resultDesc.toLowerCase();
      
      if (lowerResultDesc.includes("cancelled") || lowerResultDesc.includes("cancel")) {
        status = "cancelled";
      } else if (lowerResultDesc.includes("insufficient") || lowerResultDesc.includes("balance")) {
        status = "failed_insufficient_funds";
      } else if (lowerResultDesc.includes("timeout") || lowerResultDesc.includes("time out")) {
        status = "timeout";
      } else if (lowerResultDesc.includes("invalid") || lowerResultDesc.includes("not entered")) {
        status = "failed_invalid_input";
      } else if (resultCode === 2001 && lowerResultDesc.includes("initiator information")) {
        status = "failed_invalid_input"; 
      } else if (resultCode === 1032 && lowerResultDesc.includes("cancelled")) {
        status = "cancelled"; 
      } else {
        status = "failed";
      }
    }
    
    const updateData = {
      ResultCode: resultCode,
      ResultDesc: resultDesc,
      Status: status,
      UpdatedAt: new Date(),
      MerchantRequestID: stkCallback.MerchantRequestID || existingTransaction.MerchantRequestID
    };
    
    // Add more details if txn was successful
    if (resultCode === 0 && stkCallback.CallbackMetadata && stkCallback.CallbackMetadata.Item) {
      const details = stkCallback.CallbackMetadata.Item.reduce((acc, item) => {
        if (item.Value !== undefined && item.Value !== null) {
          acc[item.Name] = item.Value;
        }
        return acc;
      }, {});

      updateData.Amount = details.Amount;
      updateData.MpesaReceiptNumber = details.MpesaReceiptNumber;
      updateData.TransactionDate = details.TransactionDate ? details.TransactionDate.toString() : undefined;
      updateData.PhoneNumber = details.PhoneNumber ? details.PhoneNumber.toString() : undefined;
      
      if (details.Balance !== undefined) {
        updateData.Balance = details.Balance;
      }
    }
    
    const updatedTransaction = await Transaction.findOneAndUpdate(
      { CheckoutRequestID: checkoutRequestId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    console.log(`Transaction ${checkoutRequestId} updated with status: ${status}`);
    
    if (resultCode === 0) {
      console.log(`Payment successful - Receipt: ${updateData.MpesaReceiptNumber}, Amount: ${updateData.Amount}`);
    }
    
    res.status(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
    
  } catch (error) {
    console.error('Error processing callback:', error.message);
    // Still return success to MPesa to prevent retries
    res.status(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

module.exports = router;
