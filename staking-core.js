/* =========================================================
   ALBUKHR STAKING CORE
   - Shared ledger & utilities
   - NO project rules
   - NO internal/external logic
   ========================================================= */

/* STORAGE KEYS */
const CORE_KEYS = {
  STAKES: "albukhr_stakes_v1",
  TXS: "albukhr_transactions_v1"
};

/* -------------------------------
   INTERNAL HELPERS
---------------------------------*/
function _load(key){
  try{
    return JSON.parse(localStorage.getItem(key)) || [];
  }catch(e){
    return [];
  }
}

function _save(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

function _uuid(){
  return "tx_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
}

function _now(){
  return Date.now();
}

/* -------------------------------
   CORE DATA ACCESS
---------------------------------*/
function getAllStakes(){
  return _load(CORE_KEYS.STAKES);
}

function getAllTransactions(){
  return _load(CORE_KEYS.TXS);
}

/* -------------------------------
   CORE WRITE OPERATIONS
---------------------------------*/
function recordStake(stake){
  const stakes = getAllStakes();
  stakes.push(stake);
  _save(CORE_KEYS.STAKES, stakes);
}

function recordTransaction(tx){
  const txs = getAllTransactions();
  txs.push(tx);
  _save(CORE_KEYS.TXS, txs);
}

/* -------------------------------
   VALIDATION (GENERIC)
---------------------------------*/
function validateAmount(amount){
  return typeof amount === "number" && amount > 0;
}

function validateProjectId(id){
  return typeof id === "string" && id.length > 1;
}

/* -------------------------------
   STAKE FACTORY (RAW)
   NOTE: rules handled elsewhere
---------------------------------*/
function createStake({
  user,
  projectId,
  projectType,     // "internal" | "external"
  amount,
  meta = {}
}){
  if(!validateAmount(amount)) throw "Invalid amount";
  if(!validateProjectId(projectId)) throw "Invalid project";

  return {
    stakeId: _uuid(),
    user,
    projectId,
    projectType,
    amount,
    status: "Pending",
    createdAt: _now(),
    meta
  };
}

/* -------------------------------
   TRANSACTION FACTORY
---------------------------------*/
function createTransaction({
  user,
  projectId,
  amount,
  type = "stake",  // stake | reward | refund
  status = "Successful"
}){
  return {
    txId: _uuid(),
    user,
    projectId,
    amount,
    type,
    status,
    timestamp: _now()
  };
}

/* -------------------------------
   TOTALS (USED BY HOME)
---------------------------------*/
function getTotals(){
  const txs = getAllTransactions();

  let totalStake = 0;
  let totalReward = 0;

  txs.forEach(tx=>{
    if(tx.type === "stake" && tx.status === "Successful"){
      totalStake += tx.amount;
    }
    if(tx.type === "reward" && tx.status === "Successful"){
      totalReward += tx.amount;
    }
  });

  return { totalStake, totalReward };
}

/* -------------------------------
   DATE FORMAT (ANTI-NaN SAFE)
---------------------------------*/
function formatDateTime(obj){
  const ts = obj.timestamp || obj.createdAt || Date.now();
  const d = new Date(ts);

  if(isNaN(d.getTime())){
    return { date:"—", time:"—" };
  }

  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})
  };
}

/* -------------------------------
   PUBLIC API (READ-ONLY)
---------------------------------*/
function getStakes(){
  return getAllStakes();
}

function getTransactions(){
  return getAllTransactions();
}
