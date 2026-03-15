/* =====================================
   ALBUKHR PROJECT DISCOVERY ALGORITHM
===================================== */

/* TRENDING PROJECTS */

function getTrendingProjects(){

if(typeof getProjects!=="function") return [];

const projects = getProjects();

return projects.map(p=>{

const investors =
typeof getAllStakesMerged==="function"
? getAllStakesMerged().filter(s=>s.project===p.name).length
: 0;

const treasury =
typeof getProjectTreasuryStatus==="function"
? getProjectTreasuryStatus(p.name)
: {liquidity:0};

const liquidity = treasury.liquidity || 0;

const score =
(investors * 3) + (liquidity * 0.02) + (p.roi || 0);

return {
...p,
score
};

})
.sort((a,b)=>b.score-a.score)
.slice(0,5);

}


/* NEW PROJECTS */

function getNewProjects(){

if(typeof getProjects!=="function") return [];

return getProjects()
.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
.slice(0,5);

}


/* MOST INVESTED */

function getMostInvestedProjects(){

if(typeof getProjects!=="function") return [];

const projects = getProjects();

return projects.map(p=>{

const investors =
typeof getAllStakesMerged==="function"
? getAllStakesMerged().filter(s=>s.project===p.name).length
: 0;

return {
...p,
investors
};

})
.sort((a,b)=>b.investors-a.investors)
.slice(0,5);

}
