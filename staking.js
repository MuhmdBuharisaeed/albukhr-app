// =======================================
// ALBUKHR STAKING ENGINE v3.1 (HARDENED)
// Internal + External + Wallet Compatible
// =======================================

const INTERNAL_KEY = "albukhr_stakes";
const EXTERNAL_KEY = "albukhr_external_projects";

/* ======================================
   STORAGE CORE
====================================== */
function _safeParse(key){
  try{
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : [];
  }catch{
    return [];
  }
}

function _save(key,data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* ======================================
   PROJECT RULES
====================================== */
const PROJECT_RULES = {
  Raheem:{minStake:10},
  Hauwal:{minStake:20},
  Barsh:{minStake:100},
  Khairat:{minStake:50},
  Urban:{minStake:150},
  Labbaika:{minStake:30}
};

function getMinStake(project){
  return PROJECT_RULES?.[project]?.minStake || 0;
}

/* ======================================
   REWARD RATES
====================================== */
function getRate(project,duration){

  const d = Number(duration);

  const table = {
    Raheem:{30:0.01,60:0.025,90:0.05},
    Hauwal:{30:0.02,60:0.04,90:0.08},
    Khairat:{30:0.025,60:0.05,90:0.09},
    Barsh:{30:0.03,60:0.06,90:0.10},
    Labbaika:{30:0.02,60:0.045,90:0.075},
    Urban:{30:0.12,60:0.12,90:0.12}
  };

  return table?.[project]?.[d] || 0;
}

/* ======================================
   ADD INTERNAL STAKE
====================================== */
function addStake({project,amount,duration}){

  const safeAmount   = Number(amount);
  const safeDuration = Number(duration);

  if(!project || isNaN(safeAmount) || safeAmount <= 0){
    return false;
  }

  if(safeAmount < getMinStake(project)){
    return false;
  }

  const rate   = getRate(project,safeDuration);
  const reward = safeAmount * rate;

  const stakes = _safeParse(INTERNAL_KEY);

  stakes.push({
    id:"ST-"+Date.now(),
    project,
    amount:safeAmount,
    duration:safeDuration,
    reward:Number(reward)||0,
    status:"Successful",
    timestamp:Date.now(),
    type:"internal"
  });

  _save(INTERNAL_KEY,stakes);
  return true;
}

/* ======================================
   EXTERNAL PROJECTS
====================================== */
function getExternalProjects(){
  return _safeParse(EXTERNAL_KEY);
}

function addExternalStake(data){

  const projects = _safeParse(EXTERNAL_KEY);

  projects.push({
    id:"EX-"+Date.now(),
    project:data.project || "External",
    amount:Number(data.amount)||0,
    duration:Number(data.duration)||0,
    reward:Number(data.reward)||0,
    status:"pending",
    timestamp:Date.now(),
    type:"external"
  });

  _save(EXTERNAL_KEY,projects);
}

/* OPTIONAL ADMIN APPROVAL */
function approveExternalStake(id){

  const projects = _safeParse(EXTERNAL_KEY);

  const updated = projects.map(p=>{
    if(p.id === id){
      return {...p,status:"approved"};
    }
    return p;
  });

  _save(EXTERNAL_KEY,updated);
}

/* ======================================
   MERGED STAKES
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
    .map(s=>({
      ...s,
      timestamp:s.timestamp || Date.now()
    }))
    .sort((a,b)=>b.timestamp - a.timestamp);
}

/* ======================================
   TOTALS
====================================== */
function getTotals(){

  const all = getAllStakesMerged();

  let totalStake  = 0;
  let totalReward = 0;

  all.forEach(s=>{
    totalStake  += Number(s.amount)||0;
    totalReward += Number(s.reward)||0;
  });

  return {totalStake,totalReward};
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
    stake  += Number(s.amount)||0;
    reward += Number(s.reward)||0;
  });

  return {stake,reward,stakes:filtered};
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
    date:d.toLocaleDateString("en-GB"),
    time:d.toLocaleTimeString("en-GB",{
      hour:"2-digit",
      minute:"2-digit",
      second:"2-digit"
    })
  };
}

/* ======================================
   LEGACY WRAPPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }

/* ======================================
   GET MATURED CAPITAL BY PROJECT
====================================== */
function getMaturedCapitalByProject(project){

  const stakes = _safeParse(INTERNAL_KEY);

  let total = 0;

  stakes.forEach(s=>{
    if(
      s.project === project &&
      !s.capitalWithdrawn &&
      isStakeMatured(s)
    ){
      total += Number(s.amount) || 0;
    }
  });

  return total;
}

/* ======================================
   WITHDRAW ALL MATURED CAPITAL (PROJECT)
====================================== */
function withdrawProjectCapital(project){

  const stakes = _safeParse(INTERNAL_KEY);

  let total = 0;
  let updated = false;

  const newStakes = stakes.map(s=>{

    if(
      s.project === project &&
      !s.capitalWithdrawn &&
      isStakeMatured(s)
    ){
      total += Number(s.amount) || 0;
      updated = true;

      return {
        ...s,
        capitalWithdrawn:true
      };
    }

    return s;
  });

  if(!updated){
    return { error:"No matured capital available" };
  }

  _save(INTERNAL_KEY,newStakes);

  return {
    success:true,
    amount: total
  };
}
