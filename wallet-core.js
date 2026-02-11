/* ===============================
   ALBUKHR WALLET LEDGER SYSTEM
================================ */

const LEDGER_KEY = "albukhr_wallet_ledger";

/* GET LEDGER */
function getLedger(){
  return JSON.parse(localStorage.getItem(LEDGER_KEY)) || [];
}

/* SAVE LEDGER */
function saveLedger(list){
  localStorage.setItem(LEDGER_KEY, JSON.stringify(list));
}

/* ADD TRANSACTION */
function addTransaction(type, project, amount, walletAddress){
  const list = getLedger();

  list.push({
    id: "TX-" + Date.now(),
    type,
    project,
    amount: parseFloat(amount),
    wallet: walletAddress,
    createdAt: Date.now()
  });

  saveLedger(list);
}

/* ===============================
   CALCULATIONS
================================ */

function getTotalStake(){
  return getLedger()
    .filter(t=>t.type==="stake")
    .reduce((sum,t)=>sum+t.amount,0);
}

function getTotalRewards(){
  return getLedger()
    .filter(t=>t.type==="reward")
    .reduce((sum,t)=>sum+t.amount,0);
}

function getTotalWithdrawn(){
  return getLedger()
    .filter(t=>t.type==="withdraw")
    .reduce((sum,t)=>sum+t.amount,0);
}

function getAvailableReward(){
  return getTotalRewards() - getTotalWithdrawn();
}
