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

  list.push(project);

  localStorage.setItem(EXTERNAL_KEY, JSON.stringify(list));
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
   PROJECTS PAGE FILTERS
-------------------------------- */
function getApprovedExternalProjects(){
  return getExternalProjects().filter(p=>p.status==="approved");
}

function getPendingExternalProjects(){
  return getExternalProjects().filter(p=>p.status==="pending");
}


/* -------------------------------
   STAKING (LOCKED BY DESIGN)
-------------------------------- */
function addExternalStake(){
  alert("External staking locked until escrow verification");
  return false;
}

function getExternalTotals(){
  return { totalStake:0, totalReward:0 };
}

function getExternalProjectTotals(){
  return { stake:0, reward:0, stakes:[] };
     }
