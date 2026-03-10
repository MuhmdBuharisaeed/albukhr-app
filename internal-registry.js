// ===============================
// ALBUKHR INTERNAL REGISTRY (FIXED)
// ===============================

const INTERNAL_KEY = "albukhr_internal_projects";

/* ===============================
   CORE STORAGE
================================ */

function getInternalProjects(){
  try{
    return JSON.parse(localStorage.getItem(INTERNAL_KEY)) || [];
  }catch{
    return [];
  }
}

function saveInternalProjects(list){
  localStorage.setItem(INTERNAL_KEY, JSON.stringify(list));
}

/* ===================================
   ADMIN APPROVAL
=================================== */

function approveInternalProject(projectId){

const list = getInternalList();

const project =
list.find(p => p.id === projectId);

if(!project) return;

project.status = "internal_approved";
project.approvedAt = Date.now();

saveInternalList(list);

/* =============================
   REGISTER TO MARKETPLACE
============================= */

if(typeof registerProject === "function"){

registerProject({

name: project.projectName,

description: project.summary,

roi: project.roi || 0,

liquidity: project.initialLiquidity || 0,

type: "internal",

minimum: 1,

target: 1000

});

}

}

/* ===============================
   HELPERS
================================ */

function getLastProjectByInternalId(internalId){
  const list = getInternalProjects()
    .filter(p => p.internalId === internalId)
    .sort((a,b)=>b.createdAt - a.createdAt);
  return list[0] || null;
}

function isLockedByApproval(project){
  if(project.status !== "internal_approved") return false;

  const approvedAt = project.approvedAt || 0;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return (Date.now() - approvedAt) < sevenDays;
}

/* ===============================
   REGISTER (USER SIDE)
================================ */

function canSubmitInternalProject(internalId){
  const last = getLastProjectByInternalId(internalId);
  if(!last) return true;

  if(last.status === "internal_pending") return false;
  if(last.status === "internal_rejected") return true;

  if(last.status === "internal_approved"){
    return !isLockedByApproval(last);
  }

  return true;
}

function registerInternalProject(data){
  if(!canSubmitInternalProject(data.internalId)){
    alert("Submission locked. Await admin decision or approval cooldown.");
    return false;
  }

  const list = getInternalProjects();

  list.push({
    ...data,
    id: data.id || ("INT-" + Date.now()),
    status: "internal_pending",
    createdAt: Date.now()
  });

  saveInternalProjects(list);
  return true;
}

/* ===============================
   ADMIN ACTIONS
================================ */

function updateInternalStatus(id,status){
  const list = getInternalProjects();
  const p = list.find(x => x.id === id);

  if(p){
    p.status = status;

    if(status === "internal_approved"){
      p.approvedAt = Date.now();
    }

    if(status === "internal_rejected"){
      delete p.approvedAt;
    }
  }

  saveInternalProjects(list);
}

function updateInternalStage(id,stage){
  const list = getInternalProjects();
  const p = list.find(x => x.id === id);

  if(p){
    p.stage = stage;
  }

  saveInternalProjects(list);
}
