/* ======================================
   ALBUKHR – UNIFIED TRANSACTIONS LAYER
   READ-ONLY • SAFE • NON-DESTRUCTIVE
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
        amount: s.amount,
        status: s.status,
        timestamp: s.timestamp,
        type: "stake"
      });
    });
  }

  /* -------- EXTERNAL -------- */
  if(localStorage.getItem("albukhr_external_stakes")){
    JSON.parse(localStorage.getItem("albukhr_external_stakes") || "[]")
      .forEach(s=>{
        txs.push({
          source: "external",
          projectId: s.projectId,
          user: s.userPiUID,
          amount: s.amount,
          status: s.status,
          timestamp: s.timestamp,
          type: "stake"
        });
      });
  }

  /* -------- CORE (OPTIONAL) -------- */
  if(typeof getTransactions === "function"){
    getTransactions().forEach(t=>{
      txs.push({
        source: "core",
        projectId: t.projectId || "-",
        user: t.user || "-",
        amount: t.amount,
        status: t.status,
        timestamp: t.timestamp,
        type: t.type
      });
    });
  }

  /* SORT: newest first */
  return txs.sort((a,b)=>b.timestamp - a.timestamp);
}

/* TOTALS (HOME SAFE) */
function getUnifiedTotals(){
  const txs = getAllTransactionsUnified();

  let totalStake = 0;
  let totalReward = 0;

  txs.forEach(t=>{
    if(t.type === "stake" && t.status === "Successful"){
      totalStake += Number(t.amount) || 0;
    }
    if(t.type === "reward" && t.status === "Successful"){
      totalReward += Number(t.amount) || 0;
    }
  });

  return { totalStake, totalReward };
}

/* RECENT TRANSACTIONS */
function getUnifiedRecent(limit = 3){
  return getAllTransactionsUnified().slice(0, limit);
}
