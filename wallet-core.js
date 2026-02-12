/* =========================================
   ALBUKHR WALLET CORE v3 (Single Source of Truth)
   Semi-Custodial | PI SDK Ready
========================================= */

const LEDGER_KEY = "albukhr_wallet_ledger_v3";

/* =========================================
   LEDGER BASE
========================================= */

function getLedger(){
  try{
    return JSON.parse(localStorage.getItem(LEDGER_KEY)) || [];
  }catch(e){
    return [];
  }
}

function saveLedger(list){
  localStorage.setItem(LEDGER_KEY, JSON.stringify(list));
}

/* =========================================
   ADD TRANSACTION (UNIFIED STRUCTURE)
========================================= */

function addTransaction({
  type,
  source="internal",
  projectId=null,
  amount=0,
  walletAddress=null,
  status="completed",
  reference=null
}){

  amount = parseFloat(amount);

  if(!type || isNaN(amount) || amount <= 0) return false;

  const tx = {
    id: "TX-" + Date.now() + "-" + Math.floor(Math.random()*1000),
    type,
    source,
    projectId,
    amount,
    walletAddress,
    status,
    reference,
    createdAt: Date.now()
  };

  const list = getLedger();
  list.push(tx);
  saveLedger(list);

  return tx;
}

/* =========================================
   FILTER HELPERS
========================================= */

function getCompleted(){
  return getLedger().filter(t=>t.status==="completed");
}

function getByType(type){
  return getCompleted().filter(t=>t.type===type);
}

function getByProject(projectId){
  return getCompleted().filter(t=>t.projectId===projectId);
}

/* =========================================
   CALCULATIONS (Single Truth)
========================================= */

function getTotalStake(){
  return getByType("stake")
    .reduce((sum,t)=>sum+t.amount,0);
}

function getTotalRewards(){
  return getByType("reward")
    .reduce((sum,t)=>sum+t.amount,0);
}

function getTotalWithdrawn(){
  return getByType("withdraw")
    .reduce((sum,t)=>sum+t.amount,0);
}

function getTotalReceived(){
  return getByType("receive")
    .reduce((sum,t)=>sum+t.amount,0);
}

/* =========================================
   BALANCE LOGIC
========================================= */

function getLockedBalance(){
  return getTotalStake();
}

function getRewardBalance(){
  return getTotalRewards() - getTotalWithdrawn();
}

function getAvailableBalance(){
  return Math.max(getRewardBalance(), 0);
}

function getWalletSummary(){
  return {
    locked: getLockedBalance(),
    totalRewards: getTotalRewards(),
    withdrawn: getTotalWithdrawn(),
    received: getTotalReceived(),
    available: getAvailableBalance()
  };
}

/* =========================================
   SAFE OPERATIONS
========================================= */

function requestWithdraw(amount, walletAddress){

  amount = parseFloat(amount);

  if(isNaN(amount) || amount <= 0)
    return {error:"Invalid amount"};

  if(amount > getAvailableBalance())
    return {error:"Insufficient reward balance"};

  if(typeof canTransact === "function" && !canTransact())
    return {error:"Transactions locked"};

  return addTransaction({
    type:"withdraw",
    walletAddress,
    amount
  });
}

function creditReceive(amount){
  return addTransaction({
    type:"receive",
    source:"external",
    amount
  });
}

function recordStake(projectId, amount){
  return addTransaction({
    type:"stake",
    projectId,
    amount
  });
}

function recordReward(projectId, amount){
  return addTransaction({
    type:"reward",
    projectId,
    amount
  });
}

/* =========================================
   DEV TOOLS
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(LEDGER_KEY);
  console.log("Wallet ledger cleared");
}

function printWalletLedger(){
  console.table(getLedger());
}
