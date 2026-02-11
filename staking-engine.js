/* =========================================
   ALBUKHR STAKING ENGINE (UNIFIED)
========================================= */

const STAKE_KEY = "albukhr_user_stakes";

/* =========================================
   GET USER STAKES
========================================= */
function getUserStakes(){
  return JSON.parse(localStorage.getItem(STAKE_KEY)) || [];
}

function saveUserStakes(list){
  localStorage.setItem(STAKE_KEY, JSON.stringify(list));
}

/* =========================================
   STAKE INTO PROJECT
========================================= */

function stakeIntoProject(projectId, amount, userWallet){

  amount = Number(amount);

  if(!amount || amount <= 0){
    return { success:false, message:"Invalid stake amount" };
  }

  if(typeof getProjectById !== "function"){
    return { success:false, message:"Project engine not loaded" };
  }

  const project = getProjectById(projectId);

  if(!project){
    return { success:false, message:"Project not found" };
  }

  // Only approved/live projects
  if(project.status !== "approved" && project.status !== "live"){
    return { success:false, message:"Project not open for staking" };
  }

  // =============================
  // UPDATE PROJECT TOTAL STAKE
  // =============================

  project.totalStaked = Number(project.totalStaked || 0) + amount;

  updateProjectTotal(projectId, project.totalStaked);

  // =============================
  // SAVE USER STAKE RECORD
  // =============================

  const stakeRecord = {
    stakeId: "STK-" + Date.now(),
    projectId,
    projectName: project.projectName || project.title,
    type: project.type,
    amount,
    wallet: userWallet,
    date: Date.now(),
    status: "active"
  };

  const userStakes = getUserStakes();
  userStakes.push(stakeRecord);
  saveUserStakes(userStakes);

  // =============================
  // ADD TO WALLET LEDGER
  // =============================

  if(typeof addLedgerEntry === "function"){
    addLedgerEntry({
      type: "stake",
      projectId,
      amount,
      direction: "out",
      wallet: userWallet,
      date: Date.now()
    });
  }

  return { success:true, message:"Stake successful" };
}

/* =========================================
   UPDATE PROJECT TOTAL
   (Internal + External compatible)
========================================= */

function updateProjectTotal(projectId, total){

  // INTERNAL
  if(typeof getInternalLiveProjects === "function"){
    let internal = getInternalLiveProjects();
    internal.forEach(p=>{
      if(p.projectId === projectId){
        p.totalStaked = total;
      }
    });
    localStorage.setItem("albukhr_internal_live", JSON.stringify(internal));
  }

  // EXTERNAL
  if(typeof getExternalLiveProjects === "function"){
    let external = getExternalLiveProjects();
    external.forEach(p=>{
      if(p.projectId === projectId){
        p.totalStaked = total;
      }
    });
    localStorage.setItem("albukhr_external_live", JSON.stringify(external));
  }
}
