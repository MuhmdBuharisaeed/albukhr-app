/* ==================================
   ALBUKHR – STAKING CORE (SAFE HYBRID)
   WALLET FRIENDLY • NO DUPLICATION
================================== */

/* ===============================
   INTERNAL STAKE
=============================== */
function stakeInternal(projectId, amount, duration = 30){

    amount = parseFloat(amount);
    if(!projectId || amount <= 0) return false;

    /* ✅ USE MAIN ENGINE */
    return addStake({
        project: projectId,
        amount,
        duration
    });
}

/* ===============================
   EXTERNAL STAKE
=============================== */
function stakeExternal(projectId, amount){

    amount = parseFloat(amount);
    if(!projectId || amount <= 0) return false;

    /* ⚠️ DO NOT RECORD HERE */
    /* assume external-core handles storage */

    console.log("External stake initiated:", projectId, amount);

    return true;
}

/* ===============================
   PROJECT TOTAL (SAFE)
=============================== */
function getProjectStake(projectId){

    if(typeof getTransactions !== "function") return 0;

    return getTransactions()
        .filter(t => t.project === projectId && t.type === "stake")
        .reduce((sum,t)=>sum + (Number(t.amount)||0),0);
}

/* ===============================
   SAFE SYNC (NO DUPLICATE)
=============================== */
function syncExternalStakes(){

    if(typeof getExternalProjects !== "function") return;

    const externalProjects =
        getExternalProjects().filter(p => p.status === "approved");

    const txs = typeof getTransactions === "function"
        ? getTransactions()
        : [];

    externalProjects.forEach(p=>{

        const exists = txs.some(t =>
            t.project === p.projectId &&
            t.type === "stake"
        );

        if(!exists && p.staked){

            if(typeof recordStake === "function"){
                recordStake(p.projectId, p.staked);
            }

        }

    });
}
