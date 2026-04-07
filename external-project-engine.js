/* ======================================
   ALBUKHR EXTERNAL PROJECT ENGINE v3
   Clean • Secure • Wallet Compatible
====================================== */

const EXTERNAL_KEY = "albukhr_external_projects";
const EXTERNAL_LIVE_KEY = "albukhr_external_live_projects";


/* ======================================
   GET ALL PROJECTS
====================================== */

function getExternalProjects(){
return JSON.parse(
localStorage.getItem(EXTERNAL_KEY)
) || [];
}


/* ======================================
   SAVE PROJECTS
====================================== */

function saveExternalProjects(list){
localStorage.setItem(
EXTERNAL_KEY,
JSON.stringify(list)
);
}


/* ======================================
   SAVE NEW PROJECT
====================================== */

function saveExternalProject(project){

const list = getExternalProjects();

/* duplicate protection */

const exists =
list.find(p =>
p.title === project.title &&
p.owner === project.owner
);

if(exists){
return false;
}

project.status = "pending";
project.createdAt = Date.now();
project.totalStake = 0;
project.totalReward = 0;
project.escrowLocked = true;

list.push(project);

saveExternalProjects(list);

return true;

}


/* ======================================
   GET BY ID
====================================== */

function getExternalProjectById(id){
return getExternalProjects()
.find(p => p.projectId === id);
}


/* ======================================
   GET PENDING
====================================== */

function getPendingExternalProjects(){

return getExternalProjects()
.filter(p => p.status === "pending");

}


/* ======================================
   UPDATE STATUS
====================================== */

function updateExternalStatus(projectId, status){

let list =
getExternalProjects();

const admin =
localStorage.getItem("albukhr_admin")
|| "admin";

list = list.map(p=>{

if(p.projectId === projectId){

p.status = status;

p.history =
p.history || [];

p.history.push({

status,

admin,

timestamp: Date.now()

});

if(status === "approved"){

p.approvedAt =
Date.now();

p.approvedBy =
admin;

}

if(status === "rejected"){

p.rejectedAt =
Date.now();

p.rejectedBy =
admin;

}

}

return p;

});

localStorage.setItem(
"albukhr_external_projects",
JSON.stringify(list)
);

}

/* ======================================
   LIVE PROJECT ENGINE
====================================== */

function getExternalLiveProjects(){

return JSON.parse(
localStorage.getItem(EXTERNAL_LIVE_KEY)
) || [];

}


function saveExternalLiveProjects(list){

localStorage.setItem(
EXTERNAL_LIVE_KEY,
JSON.stringify(list)
);

}


function createExternalLiveProject(project){

const list =
getExternalLiveProjects();

const exists =
list.find(
p => p.sourceRegistryId === project.projectId
);

if(exists) return;

const live = {

projectId: "EXTLIVE-" + Date.now(),
sourceRegistryId: project.projectId,

title: project.title,
category: project.category,
description: project.description,
owner: project.owner,

rewardRate: 0.08,
duration: 30,

totalStake: 0,
totalReward: 0,

status:"active",
createdAt: Date.now()

};

list.push(live);

saveExternalLiveProjects(list);

}


/* ======================================
   STAKE
====================================== */

function addExternalStake(projectId,amount){

const project =
getExternalProjectById(projectId);

if(!project){
return {error:"Project not found"};
}

if(project.status !== "approved"){
return {error:"Project not approved"};
}

if(project.escrowLocked){
return {error:"Escrow locked"};
}

amount = Number(amount);

if(!amount || amount <= 0){
return {error:"Invalid amount"};
}

const stake = {

id:"EXT-" + Date.now(),
projectId,
amount,
reward:0,
timestamp:Date.now(),
status:"Successful"

};

/* save stake */

const stakes =
JSON.parse(
localStorage.getItem("albukhr_external_stakes")
)||[];

stakes.push(stake);

localStorage.setItem(
"albukhr_external_stakes",
JSON.stringify(stakes)
);


/* update project total */

let projects =
getExternalProjects();

projects = projects.map(p => {

if(p.projectId === projectId){
p.totalStake =
(Number(p.totalStake)||0) + amount;
}

return p;

});

saveExternalProjects(projects);


/* record tx */

if(typeof recordTx === "function"){

recordTx({
type:"external_stake",
project:projectId,
amount
});

}

return stake;

}


/* ======================================
   TOTALS
====================================== */

function getExternalTotals(){

const stakes =
JSON.parse(
localStorage.getItem("albukhr_external_stakes")
)||[];

const totalStake =
stakes.reduce(
(sum,s)=>sum + (Number(s.amount)||0),
0
);

const totalReward =
stakes.reduce(
(sum,s)=>sum + (Number(s.reward)||0),
0
);

return {
totalStake,
totalReward
};

}


/* ======================================
   AUTO SYNC
====================================== */

function syncExternalProjects(){

const approved =
getExternalProjects()
.filter(p=>p.status==="approved");

approved.forEach(p=>{
createExternalLiveProject(p);
});

}

function postProjectUpdate(data){

let feed =
JSON.parse(
localStorage.getItem("albukhr_project_feed")
)||[];

feed.push({

id:"FEED-"+Date.now(),

project:data.project,

projectId:data.projectId,

type:data.type,

image:data.image,

description:data.description,

time:data.time

});

localStorage.setItem(
"albukhr_project_feed",
JSON.stringify(feed)
);

}

/* AUTO LOAD */

document.addEventListener(
"DOMContentLoaded",
()=>{
if(typeof syncExternalProjects === "function"){
syncExternalProjects();
}
});
