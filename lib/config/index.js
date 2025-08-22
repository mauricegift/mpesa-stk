// you can require dotenv to load credentials from .env file
// require('dotenv').config();
module.exports = {
    port: process.env.PORT || "3000",
    shortCode: process.env.SHORTCODE || "", // Your ShortCode Here
    nodeEnv: process.env.NODE_ENV || "production",
    consumerKey: process.env.CONSUMER_KEY || "", // Your Consumer Key from daraja portal
    callbackUrl: process.env.CALLBACK_URL || "http://localhost:3000/mpesa/callback.php", // Replace with your deployed app url since callback url must be https(secure)
    passkey: process.env.PASSKEY || "", // Your passkey sent together with your shortcode to your email after you go live on daraja portal
    consumerSecret: process.env.CONSUMER_SECRET || "", // Your consumer secret from daraja portal 
    mongoUri: process.env.MONGO_URI || "", // But this is optional, i just added simple db
};

