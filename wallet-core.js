/* =========================================
   ALBUKHR WALLET CORE v2 (Ledger System)
   Semi-Custodial | PI SDK Ready
========================================= */

const LEDGER_KEY = "albukhr_wallet_ledger_v2";

/* =========================================
   LEDGER BASE
========================================= */

function getLedger(){
  return JSON.parse(localStorage.getItem(LEDGER_KEY)) || [];
}

function saveLedger(list){
  localStorage.setItem(LEDGER_KEY, JSON.stringify(list));
}

/* =========================================
   ADD TRANSACTION (UNIFIED FORMAT)
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
  if(!type || !amount) return false;

  const tx = {
    id: "TX-" + Date.now() + "-" + Math.floor(Math.random()*1000),
    type,
    source,
    projectId,
    amount: parseFloat(amount),
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

function getByType(type){
  return getLedger().filter(t=>t.type===type && t.status==="completed");
}

function getByProject(projectId){
  return getLedger().filter(t=>t.projectId===projectId && t.status==="completed");
}

/* =========================================
   CALCULATIONS
========================================= */

function getTotalStake(){
  return getByType("stake").reduce((sum,t)=>sum+t.amount,0);
}

function getTotalRewards(){
  return getByType("reward").reduce((sum,t)=>sum+t.amount,0);
}

function getTotalWithdrawn(){
  return getByType("withdraw").reduce((sum,t)=>sum+t.amount,0);
}

function getTotalReceived(){
  return getByType("receive").reduce((sum,t)=>sum+t.amount,0);
}

/* =========================================
   WALLET BALANCE LOGIC
========================================= */

function getLockedBalance(){ return getTotalStake(); }
function getRewardBalance(){ return getTotalRewards() - getTotalWithdrawn(); }
function getAvailableBalance(){ return getRewardBalance(); }

function getWalletSummary(){
  return {
    locked: getLockedBalance(),
    rewards: getRewardBalance(),
    withdrawn: getTotalWithdrawn(),
    received: getTotalReceived(),
    available: getAvailableBalance()
  };
}

/* =========================================
   WITHDRAW VALIDATION
========================================= */

function requestWithdraw(amount, walletAddress){
  amount = parseFloat(amount);
  if(amount <= 0) return {error:"Invalid amount"};
  if(amount > getAvailableBalance()) return {error:"Insufficient reward balance"};
  if(typeof canTransact === "function" && !canTransact()) return {error:"Transactions currently locked"};

  return addTransaction({
    type:"withdraw",
    amount,
    walletAddress,
    status:"completed"
  });
}

/* =========================================
   RECEIVE CREDIT
========================================= */

function creditReceive(amount, source="system"){
  if(amount <= 0) return false;
  return addTransaction({
    type:"receive",
    source,
    amount,
    status:"completed"
  });
}

/* =========================================
   PROJECT STAKE ENTRY
========================================= */

function recordStake(projectId, amount, source="internal"){
  if(amount <= 0) return false;
  return addTransaction({
    type:"stake",
    projectId,
    source,
    amount,
    status:"completed"
  });
}

/* =========================================
   REWARD ENTRY
========================================= */

function recordReward(projectId, amount){
  if(amount <= 0) return false;
  return addTransaction({
    type:"reward",
    projectId,
    amount,
    projectId,
    status:"completed"
  });
}

/* =========================================
   DEBUG / DEV HELPER
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(LEDGER_KEY);
  console.log("Wallet ledger cleared");
}

function printWalletLedger(){
  console.table(getLedger());
     }
