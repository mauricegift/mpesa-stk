module.exports = {
    port: process.env.PORT || "3000",
    shortCode: process.env.SHORTCODE || "", // Your ShortCode Here
    nodeEnv: process.env.NODE_ENV || "production",
    consumerKey: process.env.CONSUMER_KEY || "", // Your Consumer Ker from daraja portal
    callbackUrl: process.env.CALLBACK_URL || "http://localhost:3000/mpesa/callback.php", // Replace with your deployed app url
    passkey: process.env.PASSKEY || "", // Your passkey sent to your email after you go love on daraja portal
    consumerSecret: process.env.CONSUMER_SECRET || "", // Your consumer secret from daraja portal
    mongoUri: process.env.MONGO_URI || "", // But this is optional
};

