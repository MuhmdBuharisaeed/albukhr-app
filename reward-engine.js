/* ===============================
   ALBUKHR REWARD ENGINE
   Auto-sync with Wallet Ledger
================================ */

function giveReward(projectId, amount){
    amount = parseFloat(amount);
    if(!projectId || amount <= 0) return false;

    // Record reward in Wallet Ledger
    const tx = recordReward(projectId, amount);

    console.log("Reward recorded:", tx);
    return tx;
}

// Auto-sync rewards for all projects
function syncProjectRewards(projects){
    projects.forEach(p=>{
        if(p.rewards && p.rewards > 0){
            recordReward(p.projectId, p.rewards);
        }
    });
}

// Get reward balance for a project
function getProjectReward(projectId){
    return getByProject(projectId)
        .filter(t=>t.type==="reward")
        .reduce((sum,t)=>sum+t.amount,0);
}
