/* ===============================
   ALBUKHR STAKING ENGINE
   Auto-sync with Wallet Ledger
================================ */

function stakeInternal(projectId, amount){
    amount = parseFloat(amount);
    if(!projectId || amount <= 0) return false;

    // Record in Wallet Ledger
    const tx = recordStake(projectId, amount, "internal");

    console.log("Internal stake recorded:", tx);
    return tx;
}

function stakeExternal(projectId, amount){

if(typeof recordStake !== "function"){
console.warn("Wallet engine not loaded");
return false;
}

amount = parseFloat(amount);

if(!projectId || amount <= 0) return false;

const tx =
recordStake(
projectId,
amount,
"external"
);

console.log(
"External stake recorded:",
tx
);

return tx;

}

// Get total staked for a project
function getProjectStake(projectId){
    return getByProject(projectId)
        .filter(t=>t.type==="stake")
        .reduce((sum,t)=>sum+t.amount,0);
}

// Auto-sync all approved external projects
function syncExternalStakes(){

if(typeof getExternalProjects !== "function"){
console.warn("External engine not loaded");
return;
}

const externalProjects =
getExternalProjects()
.filter(p=>p.status==="approved");

externalProjects.forEach(p=>{

if(!getByProject(p.projectId).length){

recordStake(
p.projectId,
p.staked || 0,
"external"
);

}

});

}

document.addEventListener(
"DOMContentLoaded",
()=>{
if(typeof syncExternalStakes === "function"){
syncExternalStakes();
}
});
