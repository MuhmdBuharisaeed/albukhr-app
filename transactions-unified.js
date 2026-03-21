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

  return txs.sort((a,b)=>b.timestamp - a.timestamp);
}

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
