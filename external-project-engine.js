/* ======================================
EXTERNAL REGISTRY STORAGE
====================================== */

const EXTERNAL_REGISTRY_KEY =
"albukhr_external_projects";

/* GET REGISTRY */

function getExternalProjects(){

return JSON.parse(
localStorage.getItem(EXTERNAL_REGISTRY_KEY)
) || [];

}

/* SAVE REGISTRY */

function saveExternalProjects(list){

localStorage.setItem(
EXTERNAL_REGISTRY_KEY,
JSON.stringify(list)
);

}

/* SAVE NEW PROJECT */

function saveExternalProject(project){

const list =
getExternalProjects();

/* DUPLICATE CHECK */

const exists =
list.find(p =>
p.title === project.title &&
p.owner === project.owner
);

if(exists){
return false;
}

list.push(project);

saveExternalProjects(list);

return true;

}

/* ======================================
CREATE LIVE PROJECT AFTER ADMIN APPROVAL
====================================== */

function createExternalLiveProject(registryProject){

const list = getExternalLiveProjects();

const newProject = {

projectId: "EXTLIVE-" + Date.now(),

sourceRegistryId:
registryProject.projectId,

name: registryProject.title,

category:
registryProject.category,

description:
registryProject.description,

owner:
registryProject.owner,

/* INVESTMENT CONFIG */

durationDays: 45,

rewardRate: 0.12,

totalStaked: 0,

totalRewardPaid: 0,

investors:0,

/* LIQUIDITY */

liquidity:0,

/* SECURITY */

escrowLocked:true,

telegramAccess:true,

riskLevel:"LOW",

status:"active",

/* TIMESTAMPS */

createdAt: Date.now(),

approvedAt: Date.now()

};

/* SAVE */

list.push(newProject);

saveExternalLiveProjects(list);

/* RECORD TRANSACTION */

if(typeof recordTx === "function"){

recordTx({
type:"external_project_live",
project:newProject.projectId,
amount:0
});

}

return newProject;

   }
