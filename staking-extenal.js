// ===================================
// ALBUKHR – EXTERNAL ESCROW ENGINE
// ===================================

const EXT_PROJECT_KEY = "albukhr_external_projects";
const EXT_STAKE_KEY   = "albukhr_external_stakes";

/* ===============================
   CORE STORAGE
================================ */
function _load(key){
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function _save(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* ===============================
   PROJECT READ
================================ */
function getExternalProjects(){
  return _load(EXT_PROJECT_KEY);
}

function getExternalProjectById(id){
  return getExternalProjects()
    .find(p => p.projectId === id);
}

/* ===============================
   ESCROW STAKE (LOCKED)
   Pi SDK WILL CALL THIS
================================ */
function createExternalStake({
  projectId,
  userPiUID,
  amount
}){
  const project = getExternalProjectById(projectId);

  if(!project) throw "Project not found";
  if(project.status !== "approved")
    throw "Project not approved";

  const stake = {
    stakeId: "EXT-" + Date.now(),
    projectId,
    userPiUID,
    amount: Number(amount),
    status: "locked",          // 🔒 ESCROW
    timestamp: new Date().toISOString()
  };

  const stakes = _load(EXT_STAKE_KEY);
  stakes.push(stake);
  _save(EXT_STAKE_KEY, stakes);

  project.totalStaked =
    (project.totalStaked || 0) + Number(amount);

  _save(EXT_PROJECT_KEY, getExternalProjects());

  return stake;
}

/* ===============================
   MILESTONE RELEASE (ALBUKHR)
================================ */
function releaseMilestone(projectId, milestoneIndex){

  const projects = getExternalProjects();
  const project  = projects.find(p => p.projectId === projectId);

  if(!project) throw "Project not found";
  if(!project.milestones) throw "No milestones";

  const m = project.milestones[milestoneIndex];

  if(!m || m.released) throw "Invalid milestone";

  // 🔓 AUTHORISE RELEASE (Pi SDK transfer happens elsewhere)
  m.released = true;
  m.releasedAt = new Date().toISOString();

  _save(EXT_PROJECT_KEY, projects);
  return m;
}

/* ===============================
   FREEZE PROJECT (EMERGENCY)
================================ */
function freezeExternalProject(projectId, reason=""){

  const projects = getExternalProjects();
  const project  = projects.find(p => p.projectId === projectId);

  if(!project) throw "Project not found";

  project.status = "frozen";
  project.freezeReason = reason;

  _save(EXT_PROJECT_KEY, projects);
}

/* ===============================
   REFUND (ALBUKHR ONLY)
================================ */
function refundExternalProject(projectId){

  const stakes = _load(EXT_STAKE_KEY);
  let count = 0;

  stakes.forEach(s=>{
    if(
      s.projectId === projectId &&
      s.status === "locked"
    ){
      s.status = "refunded";
      count++;
    }
  });

  _save(EXT_STAKE_KEY, stakes);
  return count;
}

/* ===============================
   READ-ONLY (UI SAFE)
================================ */
function getExternalStakesByProject(projectId){
  return _load(EXT_STAKE_KEY)
    .filter(s => s.projectId === projectId);
}

function getExternalStakesByUser(userPiUID){
  return _load(EXT_STAKE_KEY)
    .filter(s => s.userPiUID === userPiUID);
}

/* ===============================
   HOME / STATS BRIDGE
================================ */
function getExternalTotals(){

  const stakes = _load(EXT_STAKE_KEY);
  let totalStake = 0;

  stakes.forEach(s=>{
    if(s.status === "locked"){
      totalStake += Number(s.amount) || 0;
    }
  });

  return {
    totalStake,
    totalReward: 0 // rewards defined per project later
  };
}
