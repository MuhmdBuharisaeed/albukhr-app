// routes/projects.js

const express = require("express");
const router = express.Router();

const db = require("../db");

router.get("/:project/:userId", (req,res)=>{

  const { project, userId } = req.params;

  const stakes = db.stakes
    .filter(s => s.project === project && s.userId === userId);

  let totalStake = 0;
  let totalReward = 0;

  stakes.forEach(s=>{
    totalStake += s.amount;

    const remaining =
      (s.reward || 0) - (s.withdrawnReward || 0);

    totalReward += remaining;
  });

  res.json({
    success:true,
    stake: totalStake,
    reward: totalReward,
    stakes
  });

});

module.exports = router;
