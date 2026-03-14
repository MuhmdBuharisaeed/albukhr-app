/* =========================================
   ALBUKHR CORE PROJECT ENGINE v1
   Single Source for Core Ecosystem Projects
========================================= */

const CORE_PROJECT_KEY = "albukhr_core_projects_v1";

/* ===============================
   CORE PROJECTS
================================ */

const CORE_PROJECTS = [

{
id:"core-raheem",
name:"Raheem Pharma",
title:"Raheem Pharmacy",
icon:"💊",
sector:"Healthcare",
roi:20,
minimum:2,
target:1500,
description:"Pharmaceutical production and community healthcare distribution."
},

{
id:"core-hauwal",
name:"Hauwal Maize",
title:"Hauwal Sumonviter",
icon:"🌽",
sector:"Agriculture",
roi:18,
minimum:1,
target:1100,
description:"Maize farming and grain processing industry."
},

{
id:"core-barsh",
name:"Barsh Agro",
title:"Barsh Agro",
icon:"🌾",
sector:"Agriculture",
roi:18,
minimum:1,
target:1000,
description:"Modern agricultural production and food supply chain."
},

{
id:"core-khairat",
name:"Khairat Recycling",
title:"Khairat Organic Fertiliser",
icon:"♻️",
sector:"Environment",
roi:16,
minimum:1,
target:900,
description:"Recycling and organic fertiliser production."
},

{
id:"core-urban",
name:"Urban Transport",
title:"Urban Mobility",
icon:"🚍",
sector:"Transport",
roi:17,
minimum:1,
target:1200,
description:"Smart transportation and logistics systems."
},

{
id:"core-labbaika",
name:"Labbaika Bakery",
title:"Labbaika Bakery Center",
icon:"🍞",
sector:"Food Production",
roi:15,
minimum:1,
target:800,
description:"Industrial bakery producing bread and flour products."
},

{
id:"core-azman",
name:"Azman Chemical",
title:"Azman Futures Markers Lab",
icon:"🧪",
sector:"Industrial",
roi:19,
minimum:2,
target:1400,
description:"Industrial chemical production and financial analytics research."
}

];

/* ===============================
   STORAGE
================================ */

function getCoreProjects(){

try{

return JSON.parse(
localStorage.getItem(CORE_PROJECT_KEY)
) || [];

}catch{

return [];

}

}

function saveCoreProjects(data){

localStorage.setItem(
CORE_PROJECT_KEY,
JSON.stringify(data)
);

}

/* ===============================
   INIT CORE PROJECTS
================================ */

function initCoreProjects(){

let stored = getCoreProjects();

if(!stored.length){

stored = CORE_PROJECTS;

saveCoreProjects(stored);

}

}

/* ===============================
   ACCESS FUNCTIONS
================================ */

function getCoreProjectByName(name){

const list = getCoreProjects();

return list.find(p => p.name === name);

}

function getAllCoreProjects(){

return getCoreProjects();

}

/* AUTO INIT */

initCoreProjects();
