/* =========================================
ALBUKHR CORE INTERNAL PROJECTS SEED
========================================= */

const INTERNAL_PROJECT_KEY =
"albukhr_internal_projects_master";

/* GET ALL */

function getAllInternalProjects(){

return JSON.parse(
localStorage.getItem(INTERNAL_PROJECT_KEY)
) || [];

}

/* SAVE ALL */

function saveAllInternalProjects(list){

localStorage.setItem(
INTERNAL_PROJECT_KEY,
JSON.stringify(list)
);

}

/* CHECK SEEDED */

function internalProjectsSeeded(){

return getAllInternalProjects().length > 0;

}

/* SEED */

function seedInternalCoreProjects(){

if(internalProjectsSeeded()) return;

const now = Date.now();

const projects = [

{
id:"INT-001",
name:"Azman Features Makers Lab",
category:"Manufacturing",

rewardRates:{
30:0.08,
60:0.12,
90:0.18
},

liquidity:100,
reserve:30,
investors:0,

status:"active",
createdAt:now
},

{
id:"INT-002",
name:"Laibaika Bakery Center",
category:"Food Production",

rewardRates:{
30:0.07,
60:0.11,
90:0.15
},

liquidity:100,
reserve:30,
investors:0,

status:"active",
createdAt:now
},

{
id:"INT-003",
name:"Bash Agro",
category:"Agriculture",

rewardRates:{
30:0.09,
60:0.14,
90:0.20
},

liquidity:100,
reserve:30,
investors:0,

status:"active",
createdAt:now
},

{
id:"INT-004",
name:"Urban Mobility",
category:"Transport",

rewardRates:{
30:0.06,
60:0.10,
90:0.14
},

liquidity:100,
reserve:30,
investors:0,

status:"active",
createdAt:now
},

{
id:"INT-005",
name:"Khairat Organic Fertilizer",
category:"Agro Industry",

rewardRates:{
30:0.10,
60:0.15,
90:0.22
},

liquidity:100,
reserve:30,
investors:0,

status:"active",
createdAt:now
},

{
id:"INT-006",
name:"Hauwal Sumonviter",
category:"Processing",

rewardRates:{
30:0.08,
60:0.12,
90:0.18
},

liquidity:100,
reserve:30,
investors:0,

status:"active",
createdAt:now
},

{
id:"INT-007",
name:"Raheem Pharmacy",
category:"Healthcare",

rewardRates:{
30:0.07,
60:0.11,
90:0.16
},

liquidity:100,
reserve:30,
investors:0,

status:"active",
createdAt:now
}

];

saveAllInternalProjects(projects);

}

/* AUTO SEED */

seedInternalCoreProjects();
