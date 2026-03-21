/* ======================================
   ALBUKHR – UNIFIED TRANSACTIONS LAYER
   CLEAN • SAFE • NON-DESTRUCTIVE
====================================== */

function getAllTransactionsUnified(){

  let txs = [];

  /* -------- INTERNAL -------- */
  if(typeof getInternalStakes === "function"){
    getInternalStakes().forEach(s=>{
      txs.push({
        source: "internal",
        projectId: s.project,
        user: "internal",
        amount: Number(s.amount) || 0,
        status: s.status || "Successful",
        timestamp: s.timestamp || Date.now(),
        type: "stake"
      });
    });
  }

  /* -------- EXTERNAL -------- */
  const external =
    JSON.parse(localStorage.getItem("albukhr_external_stakes") || "[]");

  external.forEach(s=>{
    txs.push({
      source: "external",
      projectId: s.projectId,
      user: s.userPiUID,
      amount: Number(s.amount) || 0,
      status: s.status || "Successful",
      timestamp: s.timestamp || Date.now(),
      type: "stake"
    });
  });

  /* -------- CORE -------- */
  if(typeof getTransactions === "function"){
    getTransactions().forEach(t=>{
      txs.push({
        source: "core",
        projectId: t.project || t.projectId || "-",
        user: t.user || "-",
        amount: Number(t.amount) || 0,
        status: t.status || "Successful",
        timestamp: t.timestamp || Date.now(),
        type: (t.type || "stake").toLowerCase()
      });
    });
  }

  /* SORT */
  return txs.sort((a,b)=>b.timestamp - a.timestamp);
}

/* ======================================
   TOTALS (SAFE + FLEXIBLE)
====================================== */

function getUnifiedTotals(){

  const txs = getAllTransactionsUnified();

  let totalStake = 0;
  let totalReward = 0;

  txs.forEach(t=>{

    if(t.type === "stake"){
      totalStake += t.amount;
    }

    if(t.type === "reward"){
      totalReward += t.amount;
    }

  });

  return { totalStake, totalReward };
}

/* ======================================
   RECENT
====================================== */

function getUnifiedRecent(limit = 5){
  return getAllTransactionsUnified().slice(0, limit);
       }
