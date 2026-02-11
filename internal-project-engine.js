/* ===================================
   ALBUKHR INTERNAL PROJECT ENGINE
==================================== */

const INTERNAL_LIVE_KEY = "albukhr_internal_live_projects";

/* GET */
function getInternalLiveProjects(){
  return JSON.parse(localStorage.getItem(INTERNAL_LIVE_KEY)) || [];
}

/* SAVE */
function saveInternalLiveProjects(list){
  localStorage.setItem(INTERNAL_LIVE_KEY, JSON.stringify(list));
}

/* CREATE LIVE PROJECT AFTER APPROVAL */
function createInternalLiveProject(registryProject){

  const list = getInternalLiveProjects();

  const newProject = {
    projectId: "INTLIVE-" + Date.now(),
    sourceRegistryId: registryProject.id,
    name: registryProject.projectName,
    category: registryProject.category,
    stage: registryProject.stage,
    durationDays: 30, // default, admin can edit later
    rewardRate: 0.08, // 8% example
    totalStaked: 0,
    totalRewardPaid: 0,
    status: "active",
    createdAt: Date.now(),
    approvedAt: Date.now()
  };

  list.push(newProject);
  saveInternalLiveProjects(list);
}
