/* ==========================================
   ALBUKHR WALLET CORE (PRODUCTION SAFE)
   Financially Correct Accounting Model
========================================== */

/* ========= STORAGE ========= */

function getWalletTx(){
  return JSON.parse(localStorage.getItem("albukhr_wallet_tx") || "[]");
}

function saveWalletTx(data){
  localStorage.setItem("albukhr_wallet_tx", JSON.stringify(data));
}

/* ========= HELPERS ========= */

function getByType(type){
  return getWalletTx().filter(t => t.type === type);
}

/* ========= CORE TOTALS ========= */

/* LOCKED STAKING (from staking.js) */
function getLockedBalance(){
  if(typeof getTotals === "function"){
    return getTotals().totalStake || 0;
  }
  return 0;
}

/* ===== REWARDS ===== */

/* GROSS REWARDS (duk reward da aka samu) */
function getGrossRewards(){
  return getByType("reward")
    .reduce((sum,t)=> sum + Number(t.amount), 0);
}

/* TOTAL WITHDRAWN */
function getTotalWithdrawn(){
  return getByType("withdraw")
    .reduce((sum,t)=> sum + Number(t.amount), 0);
}

/* NET REWARDS (after withdraw) */
function getNetRewards(){
  const net = getGrossRewards() - getTotalWithdrawn();
  return net < 0 ? 0 : net;
}

/* AVAILABLE REWARDS (cannot exceed net) */
function getAvailableBalance(){
  return getNetRewards();
}

/* RECEIVED (external deposit if any) */
function getTotalReceived(){
  return getByType("receive")
    .reduce((sum,t)=> sum + Number(t.amount), 0);
}

/* ========= WALLET SUMMARY ========= */

function getWalletSummary(){
  return {
    locked: getLockedBalance(),        // staking locked
    grossRewards: getGrossRewards(),   // total earned
    withdrawn: getTotalWithdrawn(),    // total withdrawn
    rewards: getNetRewards(),          // net rewards
    available: getAvailableBalance(),  // available rewards
    received: getTotalReceived()
  };
}

/* ========= RECORD REWARD (Called by staking system) ========= */

function recordReward(amount, project){
  const data = getWalletTx();

  data.push({
    id: Date.now(),
    type: "reward",
    amount: Number(amount),
    project: project || "Albukhr",
    status: "Successful",
    timestamp: Date.now()
  });

  saveWalletTx(data);
}

/* ========= WITHDRAW FUNCTION ========= */

function withdrawRewards(amount, walletAddress){

  amount = Number(amount);

  if(amount <= 0){
    return { success:false, message:"Invalid amount" };
  }

  if(amount > getAvailableBalance()){
    return { success:false, message:"Insufficient rewards" };
  }

  const data = getWalletTx();

  data.push({
    id: Date.now(),
    type: "withdraw",
    amount: amount,
    walletAddress: walletAddress || "N/A",
    status: "Successful",
    timestamp: Date.now()
  });

  saveWalletTx(data);

  return { success:true };
}

/* ========= FORMAT DATE ========= */

function formatWalletDate(tx){
  const d = new Date(tx.timestamp);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString()
  };
}
