/* ==================================
   ALBUKHR – STAKING CORE (SAFE HYBRID)
   WALLET FRIENDLY • NO DUPLICATION
================================== */

/* ===============================
   INTERNAL STAKE
=============================== */
async function stakeInternal(projectId, amount, duration = 30){

    amount = parseFloat(amount);

    if(!projectId || amount <= 0) return {
        success:false,
        error:"Invalid input"
    };

    const user = JSON.parse(
        localStorage.getItem("pi_user") || "null"
    );

    if(!user){
        return {
            success:false,
            error:"Pi user not authenticated"
        };
    }

    /* 🔥 FIX: AWAIT */
    const res = await addStake({
        project: projectId,
        amount,
        duration
    });

    if(!res || !res.success){
        return {
            success:false,
            error: res?.error || "Stake failed"
        };
    }

    return {
        success:true,
        data: res.stake
    };
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

        const currentUser =
  JSON.parse(localStorage.getItem("pi_user") || "null");

const exists = txs.some(t =>
    t.project === p.projectId &&
    t.type === "stake" &&
    t.userId === currentUser?.uid
);

        if(!exists && p.staked){

            if(typeof recordStake === "function"){
                if(typeof recordTx === "function"){
  recordTx({
    type:"stake",
    project: p.projectId,
    amount: p.staked,
    meta:{source:"external"}
  });
                }
            }

        }

    });
}
