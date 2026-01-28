/* =========================================
   ALBUKHR – UNIFIED TRANSACTIONS ENGINE
   INTERNAL + EXTERNAL + CORE
   SAFE • READ-ONLY • HOME/ADMIN READY
   ========================================= */

/* ---------- STORAGE KEYS ---------- */
const CORE_TX_KEY   = "albukhr_transactions_v1";
const INT_STAKE_KEY = "albukhr_internal_stakes";
const EXT_STAKE_KEY = "albukhr_external_stakes";

/* ---------- HELPERS ---------- */

function _load(key){
  try{
    return JSON.parse(localStorage.getItem(key)) || [];
  }catch(e){
    return [];
  }
}

function _num(n){
  n = Number(n);
  return isNaN(n) ? 0 : n;
}

function _time(obj){
  return obj.timestamp || obj.createdAt || Date.now();
}

/* ---------- NORMALIZERS ---------- */

/* CORE LEDGER TX */
function normalizeCore(tx){
  return {
    source: "core",
    id: tx.txId,
    user: tx.user,
    projectId: tx.projectId,
    amount: _num(tx.amount),
    type: tx.type,        // stake | reward | refund
    status: tx.status,
    timestamp: _time(tx)
  };
}

/* INTERNAL STAKE */
function normalizeInternal(s){
  return {
    source: "internal",
    id: s.stakeId,
    user: "internal",
    projectId: s.project,
    amount: _num(s.amount),
    reward: _num(s.reward),
    type: "stake",
    status: s.status,
    timestamp: _time(s)
  };
}

/* EXTERNAL STAKE */
function normalizeExternal(s){
  return {
    source: "external",
    id: s.stakeId,
    user: s.userPiUID,
    projectId: s.projectId,
    amount: _num(s.amount),
    type: "stake",
    status: s.status,     // frozen | refunded
    timestamp: _time(s)
  };
}

/* ---------- LOADERS ---------- */

function getCoreTransactions(){
  return _load(CORE_TX_KEY).map(normalizeCore);
}

function getInternalTransactions(){
  return _load(INT_STAKE_KEY).map(normalizeInternal);
}

function getExternalTransactions(){
  return _load(EXT_STAKE_KEY).map(normalizeExternal);
}

/* ---------- UNIFIED VIEW ---------- */

function getAllTransactionsUnified(){
  return [
    ...getCoreTransactions(),
    ...getInternalTransactions(),
    ...getExternalTransactions()
  ].sort((a,b)=> b.timestamp - a.timestamp);
}

/* ---------- FILTERS ---------- */

function getTransactionsByUser(user){
  return getAllTransactionsUnified()
    .filter(t => t.user === user);
}

function getTransactionsByProject(projectId){
  return getAllTransactionsUnified()
    .filter(t => t.projectId === projectId);
}

function getTransactionsBySource(source){
  return getAllTransactionsUnified()
    .filter(t => t.source === source); // core | internal | external
}

/* ---------- TOTALS (DASHBOARD SAFE) ---------- */

function getUnifiedTotals(){
  const all = getAllTransactionsUnified();

  let totalStake  = 0;
  let totalReward = 0;
  let totalRefund = 0;

  all.forEach(t=>{
    if(t.type === "stake" && t.status === "Successful"){
      totalStake += _num(t.amount);
    }
    if(t.type === "reward"){
      totalReward += _num(t.amount || t.reward);
    }
    if(t.type === "refund"){
      totalRefund += _num(t.amount);
    }
  });

  return {
    totalStake,
    totalReward,
    totalRefund
  };
}

/* ---------- RECENT ---------- */

function getRecentTransactions(limit = 5){
  return getAllTransactionsUnified().slice(0, limit);
}
