/* ======================================
   ALBUKHR EXTERNAL PROJECT ENGINE
====================================== */

const EXTERNAL_LIVE_KEY = "albukhr_external_live_projects";

/* GET LIVE PROJECTS */
function getExternalLiveProjects(){
  return JSON.parse(localStorage.getItem(EXTERNAL_LIVE_KEY)) || [];
}

/* SAVE LIVE PROJECTS */
function saveExternalLiveProjects(list){
  localStorage.setItem(EXTERNAL_LIVE_KEY, JSON.stringify(list));
}

/* CREATE LIVE PROJECT AFTER ADMIN APPROVAL */
function createExternalLiveProject(registryProject){

  const list = getExternalLiveProjects();

  const newProject = {
    projectId: "EXTLIVE-" + Date.now(),
    sourceRegistryId: registryProject.projectId,
    name: registryProject.title,
    category: registryProject.category,
    description: registryProject.description,
    owner: registryProject.owner,

    durationDays: 45,            // admin can edit later
    rewardRate: 0.12,            // 12% example
    totalStaked: 0,
    totalRewardPaid: 0,

    escrowLocked: true,
    status: "active",

    createdAt: Date.now(),
    approvedAt: Date.now()
  };

  list.push(newProject);
  saveExternalLiveProjects(list);
}
