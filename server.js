const express = require("express");
const app = express();

app.use(express.json());

let stakes = [];
let transactions = [];

/* =========================
   VERIFY PI PAYMENT
========================= */
async function verifyPiPayment(paymentId){
  // 🔥 Replace with real Pi API later
  return true;
}

/* =========================
   STAKE
========================= */
app.post("/stake", async (req,res)=>{

  const {userId, project, amount, duration, paymentId} = req.body;

  if(!userId || !paymentId){
    return res.json({error:"Invalid request"});
  }

  const verified = await verifyPiPayment(paymentId);

  if(!verified){
    return res.json({error:"Payment not verified"});
  }

  const stake = {
    id:"ST-"+Date.now(),
    userId,
    project,
    amount,
    duration,
    reward: amount * 0.05,
    withdrawnReward:0,
    timestamp:Date.now()
  };

  stakes.push(stake);

  transactions.push({
    type:"stake",
    userId,
    project,
    amount,
    timestamp:Date.now()
  });

  res.json({success:true, stake});

});

/* =========================
   GET USER STAKES
========================= */
app.get("/stakes/:userId",(req,res)=>{

  const userStakes =
    stakes.filter(s=>s.userId === req.params.userId);

  res.json(userStakes);

});

/* =========================
   WITHDRAW
========================= */
app.post("/withdraw",(req,res)=>{

  const {userId, project, amount} = req.body;

  let remaining = amount;

  stakes.forEach(s=>{

    if(s.userId !== userId) return;
    if(s.project !== project) return;

    const available =
      s.reward - s.withdrawnReward;

    if(available > 0 && remaining > 0){

      const take = Math.min(available, remaining);

      s.withdrawnReward += take;

      remaining -= take;

    }

  });

  if(remaining > 0){
    return res.json({error:"Insufficient"});
  }

  transactions.push({
    type:"withdraw",
    userId,
    project,
    amount,
    timestamp:Date.now()
  });

  res.json({success:true});

});

app.listen(3000,()=>console.log("Server running"));
