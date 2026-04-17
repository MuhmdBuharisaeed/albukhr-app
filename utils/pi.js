const axios = require("axios");

const PI_API_KEY = "YOUR_PI_SERVER_API_KEY";

async function verifyPiPayment(paymentId){

  try{

    const res = await axios.get(
      `https://api.minepi.com/v2/payments/${paymentId}`,
      {
        headers:{
          Authorization: `Key ${PI_API_KEY}`
        }
      }
    );

    const payment = res.data;

    /* ✅ CHECK IF COMPLETED */
    if(payment.status !== "completed"){
      return { valid:false, error:"Payment not completed" };
    }

    return {
      valid:true,
      payment
    };

  }catch(err){

    return {
      valid:false,
      error:"Verification failed"
    };

  }

}

module.exports = { verifyPiPayment };
