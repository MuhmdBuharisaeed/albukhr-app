// =======================================
// ALBUKHR STAKING ENGINE v3 (UNIFIED)
// Internal + External + Wallet Ready
// =======================================

const INTERNAL_KEY = "albukhr_stakes";
const EXTERNAL_KEY = "albukhr_external_projects";

/* ======================================
   STORAGE CORE
====================================== */
function _safeParse(key){
  try{
    return JSON.parse(localStorage.getItem(key)) || [];
  }catch{
    return [];
  }
}

function _save(key,data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* ======================================
   PROJECT RULES (INTERNAL)
====================================== */
const PROJECT_RULES = {
  Raheem:   { minStake: 10 },
  Hauwal:   { minStake: 20 },
  Barsh:    { minStake: 100 },
  Khairat:  { minStake: 50 },
  Urban:    { minStake: 150 },
  Labbaika: { minStake: 30 }
};

function getMinStake(project){
  return PROJECT_RULES[project]?.minStake || 0;
}

/* ======================================
   REWARD RATES (INTERNAL)
====================================== */
function getRate(project,duration){

  if(project === "Raheem"){
    return duration === 30 ? 0.01 :
           duration === 60 ? 0.025 :
           0.05;
  }

  if(project === "Hauwal"){
    return duration === 30 ? 0.02 :
           duration === 60 ? 0.04 :
           0.08;
  }

  if(project === "Khairat"){
    return duration === 30 ? 0.025 :
           duration === 60 ? 0.05 :
           0.09;
  }

  if(project === "Barsh"){
    return duration === 30 ? 0.03 :
           duration === 60 ? 0.06 :
           0.10;
  }

  if(project === "Labbaika"){
    return duration === 30 ? 0.02 :
           duration === 60 ? 0.045 :
           0.075;
  }

  if(project === "Urban"){
    return 0.12;
  }

  return 0;
}

/* ======================================
   ADD INTERNAL STAKE
====================================== */
function addStake({project,amount,duration}){

  const safeAmount   = Number(amount);
  const safeDuration = Number(duration);
  const rate         = getRate(project,safeDuration);

  if(!project || isNaN(safeAmount) || safeAmount<=0){
    return false;
  }

  const reward = safeAmount * rate;
  const stakes = _safeParse(INTERNAL_KEY);

  stakes.push({
    id: "ST-" + Date.now(),
    project,
    amount: safeAmount,
    duration: safeDuration,
    reward: Number(reward) || 0,
    status: "Successful",
    timestamp: Date.now(),
    type: "internal"
  });

  _save(INTERNAL_KEY,stakes);
  return true;
}

/* ======================================
   EXTERNAL PROJECTS (ADMIN APPROVAL)
====================================== */
function getExternalProjects(){
  return _safeParse(EXTERNAL_KEY);
}

function addExternalStake(data){
  const projects = _safeParse(EXTERNAL_KEY);

  projects.push({
    id: "EX-" + Date.now(),
    project: data.project,
    amount: Number(data.amount) || 0,
    duration: Number(data.duration) || 0,
    reward: Number(data.reward) || 0,
    status: "pending",   // pending | approved | rejected
    timestamp: Date.now(),
    type: "external"
  });

  _save(EXTERNAL_KEY,projects);
}

/* ======================================
   MERGED STAKES (INTERNAL + APPROVED)
====================================== */
function getAllStakesMerged(){

  const internal = _safeParse(INTERNAL_KEY)
    .filter(s=>s.status==="Successful");

  const external = _safeParse(EXTERNAL_KEY)
    .filter(p=>p.status==="approved")
    .map(p=>({
      ...p,
      status:"Successful"
    }));

  return [...internal,...external]
    .sort((a,b)=>b.timestamp - a.timestamp);
}

/* ======================================
   TOTALS (MERGED)
====================================== */
function getTotals(){

  const all = getAllStakesMerged();
  let totalStake = 0;
  let totalReward = 0;

  all.forEach(s=>{
    totalStake  += Number(s.amount) || 0;
    totalReward += Number(s.reward) || 0;
  });

  return { totalStake,totalReward };
}

/* ======================================
   PROJECT TOTALS
====================================== */
function getProjectTotals(project){

  const filtered = getAllStakesMerged()
    .filter(s=>s.project===project);

  let stake = 0;
  let reward = 0;

  filtered.forEach(s=>{
    stake  += Number(s.amount) || 0;
    reward += Number(s.reward) || 0;
  });

  return { stake,reward,stakes:filtered };
}

/* ======================================
   DATE FORMAT
====================================== */
function formatDateTime(obj){

  const d = new Date(obj?.timestamp || Date.now());

  if(isNaN(d)){
    return {date:"--",time:"--"};
  }

  return{
    date: d.toLocaleDateString("en-GB"),
    time: d.toLocaleTimeString("en-GB",{
      hour:"2-digit",
      minute:"2-digit",
      second:"2-digit"
    })
  };
}

/* ======================================
   LEGACY WRAPPERS (DO NOT REMOVE)
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
