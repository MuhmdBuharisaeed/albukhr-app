/* =====================================
   ALBUKHR — EXTERNAL ESCROW ENGINE
   SAFE • LEDGER-BASED • NON-CUSTODIAL
===================================== */

const ESCROW_KEY = "albukhr_external_escrow";

/* -----------------------------
   INIT STORAGE
------------------------------ */
function initEscrow(){
  if(!localStorage.getItem(ESCROW_KEY)){
    localStorage.setItem(ESCROW_KEY, JSON.stringify({
      projects: {},   // projectId -> project meta
      stakes: []      // all external stakes
    }));
  }
}
initEscrow();

/* -----------------------------
   HELPERS
------------------------------ */
function getEscrow(){
  return JSON.parse(localStorage.getItem(ESCROW_KEY));
}

function saveEscrow(data){
  localStorage.setItem(ESCROW_KEY, JSON.stringify(data));
}

function uid(){
  return Date.now() + "_" + Math.random().toString(36).slice(2);
}

function now(){
  return new Date().toISOString();
}

/* =============================
   PROJECT REGISTRATION
   (Approved by Albukhr only)
============================= */
function registerExternalProject({
  projectId,
  title,
  owner,
  description,
  rate = 0.05   // default 5%
}){
  const db = getEscrow();

  db.projects[projectId] = {
    projectId,
    title,
    owner,
    description,
    rate,
    status: "approved",
    createdAt: now()
  };

  saveEscrow(db);
}

/* =============================
   ADD EXTERNAL STAKE (ESCROW)
============================= */
function addExternalStake({
  projectId,
  amount,
  user
}){
  const db = getEscrow();
  const project = db.projects[projectId];

  if(!project || project.status !== "approved"){
    throw new Error("Project not approved");
  }

  if(amount <= 0){
    throw new Error("Invalid amount");
  }

  const stake = {
    stakeId: uid(),
    projectId,
    projectTitle: project.title,
    amount,
    user,
    rate: project.rate,
    reward: amount * project.rate,
    status: "escrowed",     // NOT paid out
    createdAt: now()
  };

  db.stakes.push(stake);
  saveEscrow(db);

  return stake;
}

/* =============================
   READ PROJECT TOTALS
============================= */
function getExternalProjectTotals(projectId){
  const db = getEscrow();

  const stakes = db.stakes.filter(
    s => s.projectId === projectId
  );

  const stake = stakes.reduce((a,b)=>a+b.amount,0);
  const reward = stakes.reduce((a,b)=>a+b.reward,0);

  return {
    stake,
    reward,
    stakes
  };
}

/* =============================
   GLOBAL TOTALS (HOME)
============================= */
function getExternalTotals(){
  const db = getEscrow();

  return {
    totalStake: db.stakes.reduce((a,b)=>a+b.amount,0),
    totalReward: db.stakes.reduce((a,b)=>a+b.reward,0)
  };
}

/* =============================
   LIST EXTERNAL PROJECTS
============================= */
function getExternalProjects(){
  const db = getEscrow();
  return Object.values(db.projects);
}

/* =============================
   ADMIN: RELEASE FUNDS
   (Manual / Rule-based)
============================= */
function releaseExternalStake(stakeId){
  const db = getEscrow();
  const stake = db.stakes.find(s=>s.stakeId===stakeId);

  if(!stake) return false;
  if(stake.status !== "escrowed") return false;

  stake.status = "released";
  stake.releasedAt = now();

  saveEscrow(db);
  return true;
     }
