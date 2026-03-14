/* =========================================
   ALBUKHR PROJECT REGISTRY v1
   Central Registry for Albukhr Ecosystem
   Core + Internal + Future External Projects
========================================= */

const PROJECT_KEY = "albukhr_projects_registry_v1";

/* =========================================
   CORE PROJECTS
========================================= */

const ALBUKHR_CORE_PROJECTS = [

{
id:"core-barsh",
name:"Barsh Agro",
title:"Barsh Agro",
icon:"🌾",
description:"Modern agricultural production and food supply chain.",
roi:18,
minimum:1,
target:1000,
sector:"Agriculture",
type:"core"
},

{
id:"core-labbaika",
name:"Labbaika Bakery",
title:"Labbaika Bakery Center",
icon:"🍞",
description:"Industrial bakery producing bread and flour products.",
roi:15,
minimum:1,
target:800,
sector:"Food Production",
type:"core"
},

{
id:"core-raheem",
name:"Raheem Pharma",
title:"Raheem Pharmacy",
icon:"💊",
description:"Pharmaceutical production and medical supplies.",
roi:20,
minimum:2,
target:1500,
sector:"Healthcare",
type:"core"
},

{
id:"core-urban",
name:"Urban Transport",
title:"Urban Mobility",
icon:"🚍",
description:"Smart transportation and logistics services.",
roi:17,
minimum:1,
target:1200,
sector:"Transport",
type:"core"
},

{
id:"core-khairat",
name:"Khairat Recycling",
title:"Khairat Organic Fertiliser",
icon:"♻️",
description:"Recycling and environmental sustainability project.",
roi:16,
minimum:1,
target:900,
sector:"Environment",
type:"core"
},

{
id:"core-azman",
name:"Azman Chemical",
title:"Azman Futures Markers Lab",
icon:"🧪",
description:"Chemical production and industrial materials.",
roi:19,
minimum:2,
target:1400,
sector:"Industrial",
type:"core"
},

{
id:"core-hauwal",
name:"Hauwal Maize",
title:"Hauwal Sumonviter",
icon:"🌽",
description:"Maize farming and grain processing industry.",
roi:18,
minimum:1,
target:1100,
sector:"Agriculture",
type:"core"
}

];

/* =========================================
   STORAGE FUNCTIONS
========================================= */

function getProjects(){

try{

return JSON.parse(
localStorage.getItem(PROJECT_KEY)
) || [];

}catch{

return [];

}

}

function saveProjects(data){

localStorage.setItem(
PROJECT_KEY,
JSON.stringify(data)
);

}

/* =========================================
   INIT CORE PROJECTS
========================================= */

function initCoreProjects(){

let stored = getProjects();

if(!stored.length){

stored = ALBUKHR_CORE_PROJECTS;

saveProjects(stored);

}

}

/* =========================================
   ADD PROJECT (Internal / External)
========================================= */

function addProject(project){

const list = getProjects();

/* avoid duplicates */

if(list.some(p => p.name === project.name)){
return;
}

list.push(project);

saveProjects(list);

}

/* =========================================
   REMOVE PROJECT
========================================= */

function removeProject(name){

let list = getProjects();

list = list.filter(p => p.name !== name);

saveProjects(list);

}

/* =========================================
   GET PROJECT BY NAME
========================================= */

function getProjectByName(name){

const list = getProjects();

return list.find(p => p.name === name);

}

/* =========================================
   MARKETPLACE SOURCE
========================================= */

function getMarketplaceProjects(){

return getProjects();

}

/* =========================================
   AUTO INIT
========================================= */

initCoreProjects();
