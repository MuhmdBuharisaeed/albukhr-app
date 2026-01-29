/* ==========================================
   ALBUKHR – EXTERNAL STAKING (ESCROW MODEL)
   SAFE • ISOLATED • READ-ONLY FRIENDLY
   ========================================== */

/* 🔑 STORAGE KEYS (SEPARATE FROM INTERNAL) */
const EXT_PROJECT_KEY = "albukhr_external_projects";
const EXT_STAKE_KEY   = "albukhr_external_stakes";

/* ===============================
   STORAGE HELPERS (SAFE)
================================ */
function _load(key){
  try{
    return JSON.parse(localStorage.getItem(key)) || [];
  }catch{
    return [];
  }
}

function _save(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* ===============================
   PROJECT REGISTRY (EXTERNAL)
================================ */

/*
 project = {
   projectId,
   title,
   description,
   ownerPiUID,
   walletAddress,   // escrow wallet (Albukhr-controlled)
   status: "pending" | "active" | "frozen" | "completed"
   totalStaked,
   createdAt
 }
*/

function getExternalProjects(){
  return _load(EXT_PROJECT_KEY);
}

function getExternalProject(id){
  return getExternalProjects().find(p => p.projectId === id);
}

/* 🔐 Only Albukhr / Service flow should call this */
function registerExternalProject(project){

  if(!project || !project.projectId){
    return false;
  }

  const all = getExternalProjects();

  all.push({
    ...project,
    totalStaked: 0,
    status: project.status || "pending",
    createdAt: new Date().toISOString()
  });

  _save(EXT_PROJECT_KEY, all);
  return true;
}

/* ===============================
   STAKING (ESCROW – LOCK ONLY)
================================ */

/*
 stake = {
   stakeId,
   projectId,
   amount,
   userPiUID,
   status: "locked" | "released" | "refunded",
   timestamp
 }
*/

function addExternalStake({ projectId, amount, userPiUID }){

  const safeAmount = Number(amount);
  if(!projectId || isNaN(safeAmount) || safeAmount <= 0){
    return false;
  }

  const projects = getExternalProjects();
  const project  = projects.find(p => p.projectId === projectId);

  if(!project || project.status !== "active"){
    return false;
  }

  const stakes = _load(EXT_STAKE_KEY);

  stakes.push({
    stakeId: "EXT-" + Date.now(),
    projectId,
    amount: safeAmount,
    userPiUID: userPiUID || null,
    status: "locked",     // 🔒 ESCROW
    timestamp: new Date().toISOString(),
    type: "external"
  });

  project.totalStaked += safeAmount;

  _save(EXT_STAKE_KEY, stakes);
  _save(EXT_PROJECT_KEY, projects);

  return true;
}

/* ===============================
   ESCROW ACTIONS (ADMIN ONLY)
================================ */

/* 🔓 Release funds (Pi transfer via SDK happens OUTSIDE JS) */
function releaseExternalStake(stakeId){

  const stakes = _load(EXT_STAKE_KEY);
  const stake  = stakes.find(s => s.stakeId === stakeId);

  if(!stake || stake.status !== "locked"){
    return false;
  }

  stake.status = "released";
  _save(EXT_STAKE_KEY, stakes);

  return true;
}

/* ❄️ Freeze project */
function freezeExternalProject(projectId, reason=""){

  const projects = getExternalProjects();
  const project  = projects.find(p => p.projectId === projectId);

  if(!project) return false;

  project.status = "frozen";
  project.freezeReason = reason;

  _save(EXT_PROJECT_KEY, projects);
  return true;
}

/* 💸 Refund all locked stakes */
function refundExternalProject(projectId){

  const stakes = _load(EXT_STAKE_KEY);
  let count = 0;

  stakes.forEach(s=>{
    if(s.projectId === projectId && s.status === "locked"){
      s.status = "refunded";
      count++;
    }
  });

  _save(EXT_STAKE_KEY, stakes);
  return count;
}

/* ===============================
   READ-ONLY (UI / HOME SAFE)
================================ */

function getExternalTotals(){

  const stakes = _load(EXT_STAKE_KEY);
  let totalStake = 0;

  stakes.forEach(s=>{
    if(s.status === "locked" || s.status === "released"){
      totalStake += Number(s.amount) || 0;
    }
  });

  return {
    totalStake,
    totalReward: 0   // external rewards handled off-chain / per agreement
  };
}

function getExternalProjectTotals(projectId){

  const stakes = _load(EXT_STAKE_KEY)
    .filter(s => s.projectId === projectId);

  let stake = 0;

  stakes.forEach(s=>{
    if(s.status === "locked" || s.status === "released"){
      stake += Number(s.amount) || 0;
    }
  });

  return { stake, reward: 0, stakes };
}

/* ===============================
   LEGACY SAFE (DO NOT BREAK HOME)
================================ */
function getExternalStakes(){
  return _load(EXT_STAKE_KEY);
       }
