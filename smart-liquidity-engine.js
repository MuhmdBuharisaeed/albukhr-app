/* =========================================
   ALBUKHR SMART LIQUIDITY ENGINE v1
   Controls project liquidity & reward funding
========================================= */

const TREASURY_KEY = "albukhr_project_treasury_v1";
const RESERVE_PERCENT = 0.30; // 30% liquidity reserve

/* =========================================
   SAFE TREASURY ACCESS
========================================= */

function getTreasury(){
  try{
    return JSON.parse(localStorage.getItem(TREASURY_KEY)) || {};
  }catch{
    return {};
  }
}

function saveTreasury(data){
  localStorage.setItem(TREASURY_KEY, JSON.stringify(data));
}

/* =========================================
   LIQUIDITY CHECK
========================================= */

function checkProjectLiquidity(project, amount){

  const treasury = getTreasury();

  if(!treasury[project]) return false;

  return treasury[project].liquidity >= Number(amount);

}

/* =========================================
   LIQUIDITY RESERVE PROTECTION
========================================= */

function canUseLiquidity(project, amount){

  const treasury = getTreasury();

  if(!treasury[project]) return false;

  const liquidity = treasury[project].liquidity;

  const reserve = liquidity * RESERVE_PERCENT;

  if(Number(amount) > (liquidity - reserve)){
    return false;
  }

  return true;

}

/* =========================================
   FUND REWARD FROM LIQUIDITY
========================================= */

function fundRewardFromLiquidity(project, amount){

  amount = Number(amount);

  const treasury = getTreasury();

  if(!treasury[project]){
    return {error:"Project treasury missing"};
  }

  if(!canUseLiquidity(project, amount)){
    return {error:"Liquidity reserve protection triggered"};
  }

  treasury[project].liquidity -= amount;

  saveTreasury(treasury);

  if(typeof recordTransaction === "function"){
    recordTransaction({
      type:"reward-funding",
      project,
      amount
    });
  }

  return {
    success:true,
    funded:amount
  };

}

/* =========================================
   ROI CALCULATION
========================================= */

function calculateProjectROI(project){

  if(typeof getProjectWalletBreakdown !== "function")
    return 0;

  const breakdown = getProjectWalletBreakdown();

  const target =
  breakdown.find(p => p.project === project);

  if(!target) return 0;

  if(target.stake === 0) return 0;

  return (target.grossReward / target.stake) * 100;

}

/* =========================================
   AUTO REWARD DISTRIBUTION
========================================= */

function distributeProjectRewards(project){

  if(typeof getAllStakesMerged !== "function")
    return;

  const stakes =
  getAllStakesMerged()
  .filter(s => s.project === project);

  if(!stakes.length) return;

  stakes.forEach(stake => {

    const reward =
    (Number(stake.amount) || 0) * 0.02;

    const funding =
    fundRewardFromLiquidity(project, reward);

    if(!funding.error){

      if(typeof recordTransaction === "function"){
        recordTransaction({
          type:"auto-reward",
          project,
          amount:reward,
          stakeId:stake.id
        });
      }

    }

  });

}

/* =========================================
   TREASURY STATUS
========================================= */

function getProjectTreasuryStatus(project){

  const treasury = getTreasury();

  if(!treasury[project]){
    return {
      liquidity:0,
      reserve:0
    };
  }

  const liquidity =
  treasury[project].liquidity;

  const reserve =
  liquidity * RESERVE_PERCENT;

  return {
    liquidity,
    reserve
  };

    }
