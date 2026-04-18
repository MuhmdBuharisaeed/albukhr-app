const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let stakes = [];

/* =========================
   STAKE
========================= */
app.post("/stake",(req,res)=>{

  const {userId, project, amount, duration, txid} = req.body;

  if(!userId || !txid){
    return res.json({success:false,error:"Invalid request"});
  }

  const stake = {
    id:"ST-"+Date.now(),
    userId,
    project,
    amount,
    duration,
    reward: amount * 0.05,
    withdrawnReward:0,
    status:"Successful",
    timestamp:Date.now(),
    txid
  };

  stakes.push(stake);

  res.json({success:true, stake});

});

/* =========================
   GET STAKES
========================= */
app.get("/stakes",(req,res)=>{

  const uid =
    req.headers["x-user-id"] ||
    req.query.uid;

  if(!uid) return res.json([]);

  const userStakes =
    stakes.filter(s=>s.userId === uid);

  res.json(userStakes);

});

/* =========================
   WITHDRAW
========================= */
app.post("/withdraw",(req,res)=>{

  const {userId, amount} = req.body;

  let remaining = amount;

  stakes.forEach(s=>{

    if(s.userId !== userId) return;

    const available =
      s.reward - s.withdrawnReward;

    if(available > 0 && remaining > 0){

      const take = Math.min(available, remaining);

      s.withdrawnReward += take;
      remaining -= take;

    }

  });

  if(remaining > 0){
    return res.json({success:false,error:"Insufficient"});
  }

  res.json({success:true});

});

app.listen(3000,()=>console.log("✅ API LIVE"));
