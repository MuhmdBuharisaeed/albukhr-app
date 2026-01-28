/* ==================================
   ALBUKHR – INTERNAL STAKING ENGINE
   SIMPLE • GUARANTEED • TRUSTED
   ================================== */

const INT_STAKE_KEY = "albukhr_internal_stakes";

/* ---------- HELPERS ---------- */

function loadInternal(){
  try{
    return JSON.parse(localStorage.getItem(INT_STAKE_KEY)) || [];
  }catch(e){
    return [];
  }
}

function saveInternal(data){
  localStorage.setItem(INT_STAKE_KEY, JSON.stringify(data));
}

/* ---------- CORE FUNCTIONS ---------- */

/* CREATE INTERNAL STAKE (GUARANTEED) */
function stakeInternal(projectId, amount){
  amount = Number(amount);

  if(isNaN(amount) || amount <= 0){
    throw "Invalid stake amount";
  }

  const reward = +(amount * 0.10).toFixed(2); // 10% fixed reward

  /* INTERNAL RECORD */
  const stake = {
    stakeId: "INT-" + Date.now(),
    project: projectId,
    projectId,
    amount,
    reward,
    status: "Successful",
    timestamp: Date.now(),
    meta: {
      engine: "internal",
      guaranteed: true
    }
  };

  const all = loadInternal();
  all.push(stake);
  saveInternal(all);

  /* CORE LEDGER (SAFE – DOES NOT BREAK IF CORE MISSING) */
  try{
    /* RECORD STAKE */
    recordStake(
      createStake({
        user: "system",
        projectId,
        projectType: "internal",
        amount,
        meta: stake.meta
      })
    );

    /* RECORD STAKE TX */
    recordTransaction(
      createTransaction({
        user: "system",
        projectId,
        amount,
        type: "stake",
        status: "Successful"
      })
    );

    /* RECORD REWARD TX */
    recordTransaction(
      createTransaction({
        user: "system",
        projectId,
        amount: reward,
        type: "reward",
        status: "Successful"
      })
    );
  }catch(e){
    console.warn("Core ledger unavailable:", e);
  }

  return stake;
}

/* ---------- READ OPERATIONS ---------- */

/* GET ALL INTERNAL STAKES */
function getInternalStakes(){
  return loadInternal();
}

/* GET STAKES BY PROJECT */
function getInternalStakesByProject(projectId){
  return loadInternal().filter(s => s.projectId === projectId);
}

/* TOTALS (HOME DASHBOARD SAFE) */
function getInternalTotals(){
  const all = loadInternal();

  let totalStake = 0;
  let totalReward = 0;

  all.forEach(s => {
    totalStake  += Number(s.amount) || 0;
    totalReward += Number(s.reward) || 0;
  });

  return {
    totalStake,
    totalReward
  };
}

/* RECENT INTERNAL TRANSACTIONS */
function getInternalRecent(limit = 3){
  return loadInternal()
    .slice()
    .reverse()
    .slice(0, limit);
         }

function stakeInternal(project, amount){
  amount = Number(amount);

  if(isNaN(amount) || amount <= 0){
    throw "Invalid stake amount";
  }

  const reward = +(amount * 0.10).toFixed(2);

  const stake = {
    stakeId: "INT-" + Date.now(),
    project,
    amount,
    reward,
    status: "Successful",
    timestamp: Date.now()
  };

  const all = loadInternal();
  all.push(stake);
  saveInternal(all);

  /* ===== CORE TRANSACTION ===== */
  recordTransaction({
    user: "internal",
    projectId: project,
    amount,
    type: "stake",
    status: "Successful"
  });

  recordTransaction({
    user: "internal",
    projectId: project,
    amount: reward,
    type: "reward",
    status: "Successful"
  });

  return stake;
       }

/* ADD INTERNAL STAKE FROM OLD ENGINE */
function recordInternalFromLegacy(stake){
  const all = loadInternal();

  all.push({
    stakeId: stake.stakeId || ("INT-" + Date.now()),
    project: stake.project,
    amount: Number(stake.amount),
    reward: Number(stake.reward || 0),
    duration: stake.duration,
    status: stake.status || "Successful",
    timestamp: stake.timestamp || Date.now()
  });

  saveInternal(all);
}
