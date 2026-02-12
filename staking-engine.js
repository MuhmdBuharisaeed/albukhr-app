/* =========================================
   ALBUKHR STAKING ENGINE (Maturity Based)
========================================= */

const STAKE_KEY = "albukhr_user_stakes_v1";

/* GET ALL USER STAKES */
function getUserStakes(){
  return JSON.parse(localStorage.getItem(STAKE_KEY)) || [];
}

/* SAVE STAKES */
function saveUserStakes(list){
  localStorage.setItem(STAKE_KEY, JSON.stringify(list));
}

/* =========================================
   CREATE NEW STAKE
========================================= */

function stakeInProject(projectId, amount){

  const project = getInternalProject(projectId);
  if(!project) return alert("Project not found");

  if(amount <= 0) return alert("Invalid stake amount");

  const stake = {
    id: "STK-" + Date.now(),
    projectId,
    amount: parseFloat(amount),
    rewardRate: project.rewardRate,
    durationDays: project.durationDays,
    startDate: Date.now(),
    endDate: Date.now() + (project.durationDays * 86400000),
    rewardCalculated: false
  };

  const stakes = getUserStakes();
  stakes.push(stake);
  saveUserStakes(stakes);

  /* Record in ledger */
  addTransaction("stake", projectId, amount, "internal");

  alert("Stake successful");
}

/* =========================================
   CALCULATE REWARD WHEN MATURED
========================================= */

function processMaturedStakes(){

  const stakes = getUserStakes();
  let updated = false;

  stakes.forEach(stake=>{

    if(!stake.rewardCalculated && Date.now() >= stake.endDate){

      const reward = stake.amount * stake.rewardRate;

      addTransaction("reward", stake.projectId, reward, "internal");

      stake.rewardCalculated = true;
      updated = true;
    }

  });

  if(updated){
    saveUserStakes(stakes);
  }
}

/* =========================================
   AUTO CALCULATE TOTAL LOCKED
========================================= */

function getTotalLocked(){

  return getUserStakes()
    .filter(s=>Date.now() < s.endDate)
    .reduce((sum,s)=>sum + s.amount,0);
}

/* =========================================
   USER STAKE HISTORY
========================================= */

function getStakeHistory(){
  return getUserStakes();
            }
