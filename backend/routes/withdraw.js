// routes/withdraw.js

const express = require("express");
const router = express.Router();

const db = require("../db");

router.post("/", (req,res)=>{

  const { userId, project, amount } = req.body;

  if(!userId || !project || !amount){
    return res.json({ success:false, error:"Invalid data" });
  }

  let remaining = amount;

  const userStakes = db.stakes
    .filter(s => s.userId === userId && s.project === project);

  for(let s of userStakes){

    if(remaining <= 0) break;

    const available =
      (s.reward || 0) - (s.withdrawnReward || 0);

    if(available > 0){

      const take = Math.min(available, remaining);

      s.withdrawnReward += take;

      remaining -= take;
    }
  }

  if(remaining > 0){
    return res.json({
      success:false,
      error:"Insufficient balance"
    });
  }

  db.withdrawals.push({
    id:"WD-"+Date.now(),
    userId,
    project,
    amount,
    timestamp:Date.now()
  });

  res.json({
    success:true
  });

});

module.exports = router;
