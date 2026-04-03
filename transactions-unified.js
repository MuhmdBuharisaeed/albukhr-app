/* ======================================
   ALBUKHR – UNIFIED TRANSACTIONS LAYER
   CLEAN • SAFE • NON-DESTRUCTIVE
====================================== */

function getAllTransactionsUnified(){

  let txs = [];

  /* -------- INTERNAL -------- */
  txs.push({
  source: "internal",
  projectId: s.project,
  user: s.user || "internal",
  wallet: s.wallet || null,
  amount: Number(s.amount) || 0,
  status: s.status || "Successful",
  timestamp: s.timestamp || Date.now(),
  type: "stake"
});

  /* -------- EXTERNAL -------- */
  txs.push({
  source: "external",
  projectId: s.projectId,
  user: s.userPiUID,
  wallet: s.wallet || null,
  amount: Number(s.amount) || 0,
  status: s.status || "Successful",
  timestamp: s.timestamp || Date.now(),
  type: "stake"
});

  /* -------- CORE -------- */
  txs.push({
  source: "core",
  projectId: t.project || t.projectId || "-",
  user: t.user || "-",
  wallet: t.meta?.wallet || null,
  fee: Number(t.meta?.fee || 0),
  amount: Number(t.amount) || 0,
  status: t.status || "Successful",
  timestamp: t.timestamp || Date.now(),
  type: (t.type || "stake").toLowerCase()
});

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

/* ======================================
   BY PROJECT
====================================== */

function getUnifiedByProject(project){

return getAllTransactionsUnified()
.filter(t => t.projectId === project);

}
