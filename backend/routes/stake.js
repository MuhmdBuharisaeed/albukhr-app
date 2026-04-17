const express = require("express");
const router = express.Router();

const db = require("../db");
const { getRate } = require("../utils");
const { verifyPiPayment } = require("../utils/pi");

router.post("/", async (req,res)=>{

  const {
    userId,
    project,
    amount,
    duration,
    txid
  } = req.body;

  if(!userId || !project || !amount || !txid){
    return res.json({
      success:false,
      error:"Invalid data"
    });
  }

  /* 🔐 VERIFY PI PAYMENT */
const check = await verifyPiPayment(txid);

if(!check.valid){
  return res.json({
    success:false,
    error: check.error || "Payment verification failed"
  });
}

/* 🚫 BLOCK DOUBLE PAYMENT (VERY IMPORTANT) */
const exists = db.stakes.find(s => s.txid === txid);

if(exists){
  return res.json({
    success:false,
    error:"Payment already used"
  });
}

const payment = check.payment;

/* 🔍 EXTRA SECURITY CHECKS */
if(Number(payment.amount) !== Number(amount)){
  return res.json({
    success:false,
    error:"Amount mismatch"
  });
   }

  /* OPTIONAL: CHECK MEMO */
  if(!payment.memo.includes(project)){
    return res.json({
      success:false,
      error:"Invalid project memo"
    });
  }

  /* 💰 CREATE STAKE */
  const rate = getRate(project, duration);

  const newStake = {
    id:"ST-"+Date.now(),
    userId,
    project,
    amount,
    duration,
    reward: amount * rate,
    withdrawnReward:0,
    timestamp: Date.now(),
    txid
  };

  db.stakes.push(newStake);

  res.json({
    success:true,
    stake:newStake
  });

});

module.exports = router;
