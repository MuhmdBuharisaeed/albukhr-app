/* =======================================
   ALBUKHR PI PAYMENT ENGINE (TESTNET)
======================================= */

async function payAndStake(amount, project){

  try{

    if(typeof Pi === "undefined"){
      alert("Open in Pi Browser");
      return;
    }

    const payment = await Pi.createPayment({

      amount: Number(amount),

      memo: "Albukhr Stake",

      metadata: {
        type: "staking",
        project: project
      }

    }, {

      /* PAYMENT CALLBACKS */

      onReadyForServerApproval: function(paymentId){
        console.log("Ready:", paymentId);
      },

      onReadyForServerCompletion: function(paymentId, txid){
        console.log("Completed:", paymentId, txid);

        // 🔥 ADD STAKE HERE
        saveStake(project, amount);
      },

      onCancel: function(paymentId){
        console.warn("Cancelled:", paymentId);
      },

      onError: function(error, payment){
        console.error("Payment Error:", error);
      }

    });

    return payment;

  }catch(e){
    console.error(e);
  }

}
