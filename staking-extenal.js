/* =========================================
   ALBUKHR – EXTERNAL PROJECT ESCROW ENGINE
========================================= */

const EXTERNAL_KEY = "albukhr_external_projects";

/* =========================================
   UTILS
========================================= */
function loadExternalList(){
  try{
    return JSON.parse(localStorage.getItem(EXTERNAL_KEY)) || [];
  }catch(e){
    console.error("External storage error", e);
    return [];
  }
}

function saveExternalList(list){
  localStorage.setItem(EXTERNAL_KEY, JSON.stringify(list));
}

/* =========================================
   SAVE NEW EXTERNAL PROJECT (USER)
========================================= */
function saveExternalProject(project){

  const list = loadExternalList();

  // prevent duplicate ID
  if(list.some(p => p.projectId === project.projectId)){
    return false;
  }

  const cleanProject = {
    projectId: project.projectId,
    title: project.title,
    category: project.category,
    description: project.description,
    owner: project.owner,
    invite: project.invite || null,

    status: "pending",
    escrowLocked: true,

    createdAt: project.createdAt || Date.now(),

    history: [{
      status: "pending",
      at: Date.now()
    }]
  };

  list.push(cleanProject);
  saveExternalList(list);
  return true;
}

/* =========================================
   GETTERS
========================================= */
function getExternalProjects(){
  return loadExternalList();
}

function getExternalProjectById(projectId){
  return loadExternalList().find(p => p.projectId === projectId) || null;
}

/* =========================================
   ADMIN ACTIONS
========================================= */
function updateExternalStatus(projectId, newStatus){

  const allowed = ["pending","approved","rejected","paused"];
  if(!allowed.includes(newStatus)) return false;

  const list = loadExternalList();
  let updated = false;

  list.forEach(p=>{
    if(p.projectId === projectId){
      p.status = newStatus;
      p.history = p.history || [];
      p.history.push({
        status: newStatus,
        at: Date.now()
      });

      if(newStatus === "approved"){
        p.approvedAt = Date.now();
        p.escrowLocked = false; // 🔓 ready for staking later
      }

      if(newStatus === "rejected"){
        p.rejectedAt = Date.now();
        p.escrowLocked = true;
      }

      updated = true;
    }
  });

  if(updated){
    saveExternalList(list);
  }

  return updated;
}

/* =========================================
   FILTERS (ADMIN / PUBLIC)
========================================= */
function getPendingExternalProjects(){
  return getExternalProjects().filter(p => p.status === "pending");
}

function getApprovedExternalProjects(){
  return getExternalProjects().filter(p => p.status === "approved");
}

function getRejectedExternalProjects(){
  return getExternalProjects().filter(p => p.status === "rejected");
}

/* =========================================
   STAKING (PLACEHOLDER – FUTURE)
========================================= */
function addExternalStake(){
  alert("🔒 External staking is locked until escrow activation.");
  return false;
}

function getExternalTotals(){
  return {
    totalStake: 0,
    totalReward: 0
  };
}

function getExternalProjectTotals(projectId){
  return {
    projectId,
    stake: 0,
    reward: 0,
    stakes: []
  };
}

/* =========================================
   ENGINE READY FLAG
========================================= */
window.__ALBUKHR_EXTERNAL_ENGINE__ = true;
