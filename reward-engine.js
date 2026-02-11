/* =========================================
   ALBUKHR REWARD ENGINE
========================================= */

const REWARD_KEY = "albukhr_rewards_paid";

/* =========================================
   CALCULATE REWARD FOR ONE STAKE
========================================= */

function calculateStakeReward(stake){

  const now = Date.now();
  const days = (now - stake.date) / (1000 * 60 * 60 * 24);

  const apr = getProjectAPR(stake.projectId);

  if(!apr) return 0;

  const reward = (stake.amount * apr * days) / 365;

  return Number(reward.toFixed(6));
}

/* =========================================
   GET PROJECT APR
========================================= */

function getProjectAPR(projectId){

  if(typeof getProjectById !== "function") return 0;

  const project = getProjectById(projectId);

  if(!project) return 0;

  // default APR fallback
  return Number(project.apr || (project.type === "internal" ? 0.12 : 0.18));
}

/* =========================================
   CALCULATE ALL USER REWARDS
========================================= */

function calculateAllRewards(){

  if(typeof getUserStakes !== "function") return 0;

  const stakes = getUserStakes();

  let totalReward = 0;

  stakes.forEach(stake=>{
    if(stake.status === "active"){
      totalReward += calculateStakeReward(stake);
    }
  });

  return Number(totalReward.toFixed(6));
}

/* =========================================
   CLAIM REWARDS
========================================= */

function claimRewards(userWallet){

  const totalReward = calculateAllRewards();

  if(totalReward <= 0){
    return { success:false, message:"No rewards available" };
  }

  // Add to wallet ledger
  if(typeof addLedgerEntry === "function"){
    addLedgerEntry({
      type:"reward",
      amount: totalReward,
      direction:"in",
      wallet: userWallet,
      date: Date.now()
    });
  }

  // Mark stakes as claimed checkpoint
  const stakes = getUserStakes();
  stakes.forEach(stake=>{
    stake.date = Date.now(); // reset timer
  });

  saveUserStakes(stakes);

  return { success:true, amount:totalReward };
}
