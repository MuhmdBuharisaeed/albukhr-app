/* ===============================
   ALBUKHR – EXTERNAL STAKING ENGINE
   Escrow / Read-only (Frontend)
   =============================== */

const EXT_PROJECT_KEY = "albukhr_external_projects";
const EXT_STAKE_KEY   = "albukhr_external_stakes";

/* ===============================
   STORAGE HELPERS (SAFE)
================================ */
function _extLoad(key){
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function _extSave(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* ===============================
   PROJECTS (EXTERNAL)
================================ */
function getExternalProjects(){
  return _extLoad(EXT_PROJECT_KEY);
}

function getExternalProjectById(id){
  return getExternalProjects()
    .find(p => p.projectId === id);
}

/* ===============================
   STAKES (READ ONLY)
================================ */
function getExternalStakes(){
  return _extLoad(EXT_STAKE_KEY);
}

function getExternalStakesByProject(projectId){
  return getExternalStakes()
    .filter(s => s.projectId === projectId);
}

function getExternalStakesByUser(userId){
  return getExternalStakes()
    .filter(s => s.userId === userId);
}

/* ===============================
   TOTALS (HOME SAFE)
================================ */
function getExternalTotals(){

  const stakes = getExternalStakes();

  let totalStake  = 0;
  let totalReward = 0;

  stakes.forEach(s=>{
    if(s.status === "locked"){
      totalStake  += Number(s.amount) || 0;
      totalReward += Number(s.reward) || 0;
    }
  });

  return { totalStake, totalReward };
}

/* ===============================
   PROJECT TOTALS (SAFE)
================================ */
function getExternalProjectTotals(projectId){

  const stakes = getExternalStakesByProject(projectId);

  let stake  = 0;
  let reward = 0;

  stakes.forEach(s=>{
    if(s.status === "locked"){
      stake  += Number(s.amount) || 0;
      reward += Number(s.reward) || 0;
    }
  });

  return { stake, reward, stakes };
}

/* ===============================
   ADD STAKE (LOCKED ESCROW)
   NOTE:
   - No Pi transfer here
   - SDK handles payment outside
================================ */
function addExternalStake({
  projectId,
  userId,
  amount,
  reward = 0
}){

  const safeAmount = Number(amount);

  if(!projectId || !userId || isNaN(safeAmount) || safeAmount <= 0){
    return false;
  }

  const stake = {
    id: "EXT-" + Date.now(),
    projectId,
    userId,
    amount: safeAmount,
    reward: Number(reward) || 0,
    status: "locked",        // 🔒 escrow
    timestamp: new Date().toISOString(),
    type: "external"
  };

  const stakes = getExternalStakes();
  stakes.push(stake);
  _extSave(EXT_STAKE_KEY, stakes);

  /* update project total */
  const projects = getExternalProjects();
  const p = projects.find(x => x.projectId === projectId);
  if(p){
    p.totalStaked = (Number(p.totalStaked) || 0) + safeAmount;
    _extSave(EXT_PROJECT_KEY, projects);
  }

  return true;
}

/* ===============================
   FORMAT DATE (REUSE STYLE)
================================ */
function formatExternalDateTime(stake){

  if(stake?.timestamp){
    const d = new Date(stake.timestamp);
    if(!isNaN(d)){
      return {
        date: d.toLocaleDateString("en-GB"),
        time: d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      };
    }
  }

  return { date:"--", time:"--" };
}
