/* ===============================
   ALBUKHR – EXTERNAL ESCROW ENGINE v2
   Compatible with wallet-core v4
================================ */

const EXTERNAL_KEY = "albukhr_external_projects";
const EXTERNAL_STAKE_KEY = "albukhr_external_stakes";

/* ===============================
   PROJECT REGISTRY
================================ */

/* SAVE NEW EXTERNAL PROJECT */
function saveExternalProject(project){

  let list = getExternalProjects();

  if(list.some(p => p.projectId === project.projectId)){
    return false;
  }

  project.status = "pending";
  project.history = [{
    status: "pending",
    at: Date.now()
  }];

  project.totalStake = 0;
  project.totalReward = 0;

  list.push(project);
  localStorage.setItem(EXTERNAL_KEY, JSON.stringify(list));

  return true;
}

/* GET ALL */
function getExternalProjects(){
  return JSON.parse(localStorage.getItem(EXTERNAL_KEY)) || [];
}

function getExternalProjectById(id){
  return getExternalProjects().find(p => p.projectId === id);
}

/* ===============================
   ADMIN STATUS CONTROL
================================ */

function updateExternalStatus(projectId, status){

  let list = getExternalProjects();

  list = list.map(p => {

    if(p.projectId === projectId){

      p.status = status;
      p.history = p.history || [];
      p.history.push({ status, at: Date.now() });

      if(status === "approved"){
        p.approvedAt = Date.now();
        p.escrowLocked = false;  // unlock after approval
      }

      if(status === "rejected"){
        p.rejectedAt = Date.now();
        p.escrowLocked = true;
      }
    }

    return p;
  });

  localStorage.setItem(EXTERNAL_KEY, JSON.stringify(list));
}

/* ===============================
   STAKING SYSTEM (External Only)
================================ */

function getExternalStakes(){
  return JSON.parse(localStorage.getItem(EXTERNAL_STAKE_KEY)) || [];
}

function saveExternalStakes(list){
  localStorage.setItem(EXTERNAL_STAKE_KEY, JSON.stringify(list));
}

/* ADD STAKE */
function addExternalStake(projectId, amount){

  const project = getExternalProjectById(projectId);

  if(!project || project.status !== "approved")
    return { error:"Project not approved" };

  amount = parseFloat(amount);

  if(amount <= 0)
    return { error:"Invalid amount" };

  const stake = {
    id: "EXT-" + Date.now(),
    projectId,
    amount,
    reward: 0,
    status: "Successful",
    timestamp: Date.now()
  };

  const list = getExternalStakes();
  list.push(stake);
  saveExternalStakes(list);

  return stake;
}

/* ===============================
   REWARD CALCULATION
================================ */

/* simple demo formula: 8% flat */
function calculateExternalRewards(){

  const stakes = getExternalStakes();

  stakes.forEach(s=>{
    if(!s.reward){
      s.reward = s.amount * 0.08;
    }
  });

  saveExternalStakes(stakes);
}

/* ===============================
   TOTALS
================================ */

function getExternalTotals(){

  const stakes = getExternalStakes()
    .filter(s => s.status === "Successful");

  const totalStake = stakes
    .reduce((sum,s)=>sum + s.amount,0);

  const totalReward = stakes
    .reduce((sum,s)=>sum + (s.reward || 0),0);

  return {
    totalStake,
    totalReward
  };
}

/* PER PROJECT TOTALS */
function getExternalProjectTotals(projectId){

  const stakes = getExternalStakes()
    .filter(s => s.projectId === projectId && s.status === "Successful");

  const stake = stakes
    .reduce((sum,s)=>sum + s.amount,0);

  const reward = stakes
    .reduce((sum,s)=>sum + (s.reward || 0),0);

  return {
    stake,
    reward,
    stakes
  };
}
