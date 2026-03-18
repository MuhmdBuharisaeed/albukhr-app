/* =========================================
   ALBUKHR UNIFIED TRANSACTION ENGINE v1.1
========================================= */

const TX_KEY = "albukhr_transactions";

/* =========================================
   STORAGE
========================================= */

function getTransactions(){
  try{
    return JSON.parse(localStorage.getItem(TX_KEY)) || [];
  }catch{
    return [];
  }
}

function saveTransactions(data){
  localStorage.setItem(TX_KEY, JSON.stringify(data));
}

/* =========================================
   RECORD TRANSACTION
========================================= */

function recordTx({
  type,
  project,
  amount,
  meta = {}
}){

  const list = getTransactions();

  const tx = {
    id: "TX-" + Date.now(),
    type,              // stake | reward | withdraw | liquidity
    project,
    amount: Number(amount) || 0,
    meta,
    timestamp: Date.now()
  };

  list.push(tx);

  saveTransactions(list);

  return tx;
}

/* =========================================
   FILTER HELPERS
========================================= */

/* BY PROJECT */
function getTxByProject(project){
  return getTransactions()
    .filter(tx => tx.project === project);
}

/* BY TYPE */
function getTxByType(type){
  return getTransactions()
    .filter(tx => tx.type === type);
}

/* RECENT */
function getRecentTx(limit = 20){
  return getTransactions()
    .slice()
    .reverse()
    .slice(0, limit);
}
