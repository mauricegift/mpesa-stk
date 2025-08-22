## MPESA STK PUSH API
**https://mpesa-stk.giftedtech.co.ke/**

<div align="center">

</div>

**This project demonstrates how to integrate Safaricom's M-Pesa STK Push API using Node.js and Express. It allows you to initiate payment requests to a mobile number via M-Pesa and handle callback responses for transaction status.**

**Default Safaricom Testing Credentials:**

* **ShortCode:** 174379
* **Passkey:** bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
* **Phone Number:** any Safaricom mpesa registered number 
* **Amount:** Any amount can be used for testing.

**Obtain Your Credentials:**

1. **Sign up for a free account on the Safaricom Developer Portal (https://developer.safaricom.co.ke/) to access the M-Pesa API.** 🚀
2. **Log in to the portal and navigate to **My Apps**. ➕**
3. **Create a new app and select the **MPesa Sandbox APIs** to activate the necessary APIs.**
4. **Copy your **Consumer Key** and **Consumer Secret** for use in the project configuration.** 🔑

**Features:**

* Initiate M-Pesa STK Push payments 💸
* Handle callback responses for transaction status ✅
* Make stk query for transaction status


**3. Configure the App:**

   * Add the following to **[config.js]()** or .env file:

      * `CONSUMER_KEY`: Your Safaricom Consumer Key
      * `CONSUMER_SECRET`: Your Safaricom Consumer Secret
      * `SHORT_CODE`: Your Safaricom ShortCode
      * `PASSKEY`: Your Safaricom Passkey
      * `NUMBER`: The phone number to send the payment request to (for testing)
      * `AMOUNT`: The amount to be paid (for testing)

   * **Crucially, update the `CALLBACK_URL` config var to use the Heroku app URL.** 
     - The Heroku app URL will be provided by Heroku after you create the app. 
     - It will typically be in the format `https://<my-deployed-app-url>/mpesa/callback`.



## Moving to Production
When transitioning to production, you'll need to:

 * Obtain Production Credentials: Contact Safaricom to acquire credentials for your Paybill or Till Number. This requires submitting business-related documents. 📝

 * Unique ShortCode and Passkey: Safaricom will provide a custom ShortCode and Passkey linked to your account. 🔑

 * Secure Deployment: Ensure your application is deployed on a reliable, secure server with HTTPS. The Callback URL must also use HTTPS. 🔒


## Disclaimer:
This project is for testing and educational purposes only.
