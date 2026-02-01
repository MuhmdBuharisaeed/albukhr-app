/* ===============================
   ALBUKHR – EXTERNAL ESCROW ENGINE
================================ */

/* STORAGE KEY */
const EXTERNAL_KEY = "albukhr_external_projects";

/* -------------------------------
   SAVE NEW EXTERNAL PROJECT
-------------------------------- */
function saveExternalProject(project){
  let list = JSON.parse(localStorage.getItem(EXTERNAL_KEY)) || [];

  if(list.some(p => p.projectId === project.projectId)){
    console.warn("External project already exists");
    return false;
  }

  project.history = [{
    status: "pending",
    at: Date.now()
  }];

  list.push(project);
  localStorage.setItem(EXTERNAL_KEY, JSON.stringify(list));
  return true;
}

/* -------------------------------
   GET ALL EXTERNAL PROJECTS
-------------------------------- */
function getExternalProjects(){
  return JSON.parse(localStorage.getItem(EXTERNAL_KEY)) || [];
}

/* -------------------------------
   GET PROJECT BY ID
-------------------------------- */
function getExternalProjectById(id){
  return getExternalProjects().find(p => p.projectId === id);
}

/* -------------------------------
   ADMIN: UPDATE PROJECT STATUS
-------------------------------- */
function updateExternalStatus(projectId, status){
  let list = getExternalProjects();

  list = list.map(p=>{
    if(p.projectId === projectId){
      p.status = status;

      if(!p.history) p.history = [];
      p.history.push({ status, at: Date.now() });

      if(status === "approved"){
        p.approvedAt = Date.now();
        p.escrowLocked = true;
      }

      if(status === "rejected"){
        p.rejectedAt = Date.now();
      }
    }
    return p;
  });

  localStorage.setItem(EXTERNAL_KEY, JSON.stringify(list));
}

/* -------------------------------
   FILTERS
-------------------------------- */
function getApprovedExternalProjects(){
  return getExternalProjects().filter(p => p.status === "approved");
}

function getPendingExternalProjects(){
  return getExternalProjects().filter(p => p.status === "pending");
}

/* -------------------------------
   STAKING (LOCKED)
-------------------------------- */
function addExternalStake(){
  alert("External staking is locked until escrow verification");
  return false;
}

function getExternalTotals(){
  return {
    totalStake: 0,
    totalReward: 0,
    source: "external"
  };
}

function getExternalProjectTotals(){
  return { stake:0, reward:0, stakes:[] };
}
