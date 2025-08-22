// I'm using production urls since i always test my projects in production and not sandbox

const axios = require('axios');
const config = require('../config');

const getAccessToken = async () => {
  try {
    const url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const encodedCredentials = Buffer.from(config.consumerKey + ":" + config.consumerSecret).toString('base64');
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': "Basic " + encodedCredentials,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data.access_token) {
      throw new Error('Failed to retrieve access token');
    }
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.message);
    throw error;
  }
};


const determineTransactionStatus = (resultCode, resultDesc) => {
  if (resultCode === 0) {
    return 'completed';
  }

  /* if (resultDesc === "The service request is processed successfully.") {
    return 'completed';
  }*/
  
  const failurePatterns = [
    /cancelled by user/i,
    /insufficient balance/i,
    /timeout/i,
    /failed/i,
    /declined/i,
    /invalid/i,
    /not supported/i
  ];
  
  const isFailure = failurePatterns.some(pattern => pattern.test(resultDesc));
  
  return isFailure ? 'failed' : 'pending';
};

module.exports = { getAccessToken, determineTransactionStatus };
