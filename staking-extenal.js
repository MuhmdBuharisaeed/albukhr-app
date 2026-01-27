/* ==================================
   ALBUKHR – EXTERNAL STAKING ENGINE
   ESCROW • VERIFIED • CONTROLLED
   ================================== */

const EXT_PROJECT_KEY = "albukhr_external_projects";
const EXT_STAKE_KEY   = "albukhr_external_stakes";

/* ---------- HELPERS ---------- */

function _load(key){
  try{
    return JSON.parse(localStorage.getItem(key)) || [];
  }catch(e){
    return [];
  }
}

function _save(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

function _id(prefix){
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2,6);
}

/* ---------- PROJECTS ---------- */

function getExternalProjects(){
  return _load(EXT_PROJECT_KEY);
}

function getExternalProject(projectId){
  return getExternalProjects().find(p => p.projectId === projectId);
}

function saveExternalProject(project){
  const all = getExternalProjects();
  all.push({
    ...project,
    totalStaked: Number(project.totalStaked) || 0,
    status: project.status || "pending",
    createdAt: Date.now()
  });
  _save(EXT_PROJECT_KEY, all);
}

/* ---------- STAKING (ESCROW) ---------- */

function stakeExternalProject(projectId, userPiUID, amount){
  amount = Number(amount);

  if(!userPiUID) throw "Invalid Pi UID";
  if(isNaN(amount) || amount <= 0) throw "Invalid amount";

  const projects = getExternalProjects();
  const project  = projects.find(p => p.projectId === projectId);

  if(!project) throw "Project not found";
  if(project.status !== "active") throw "Project not active";

  const stake = {
    stakeId: _id("EXT"),
    projectId,
    userPiUID,
    amount,
    status: "frozen", // escrow
    timestamp: Date.now()
  };

  const stakes = _load(EXT_STAKE_KEY);
  stakes.push(stake);
  _save(EXT_STAKE_KEY, stakes);

  project.totalStaked += amount;
  _save(EXT_PROJECT_KEY, projects);

  /* CORE LEDGER (SAFE) */
  try{
    recordStake(
      createStake({
        user: userPiUID,
        projectId,
        projectType: "external",
        amount,
        meta: { escrow:true }
      })
    );

    recordTransaction(
      createTransaction({
        user: userPiUID,
        projectId,
        amount,
        type: "stake",
        status: "Successful"
      })
    );
  }catch(e){
    console.warn("Core ledger unavailable:", e);
  }

  return stake;
}

/* ---------- MILESTONE RELEASE ---------- */

function releaseMilestone(projectId, milestoneId){
  const projects = getExternalProjects();
  const project = projects.find(p => p.projectId === projectId);

  if(!project) throw "Project not found";
  if(project.status !== "active") throw "Project not active";

  const milestone = project.milestones?.find(m => m.id === milestoneId);
  if(!milestone) throw "Milestone not found";
  if(milestone.released) throw "Already released";

  milestone.released = true;
  milestone.releasedAt = Date.now();

  _save(EXT_PROJECT_KEY, projects);

  // ⚠️ Real Pi transfer happens via Pi SDK (outside this engine)
  return milestone;
}

/* ---------- EMERGENCY FREEZE ---------- */

function freezeProject(projectId, reason = ""){
  const projects = getExternalProjects();
  const project = projects.find(p => p.projectId === projectId);

  if(!project) throw "Project not found";

  project.status = "frozen";
  project.freezeReason = reason;
  project.frozenAt = Date.now();

  _save(EXT_PROJECT_KEY, projects);
}

/* ---------- REFUND (ESCROW RETURN) ---------- */

function refundProject(projectId){
  const stakes = _load(EXT_STAKE_KEY);
  let count = 0;

  stakes.forEach(s=>{
    if(s.projectId === projectId && s.status === "frozen"){
      s.status = "refunded";
      count++;

      /* CORE LEDGER REFUND */
      try{
        recordTransaction(
          createTransaction({
            user: s.userPiUID,
            projectId,
            amount: s.amount,
            type: "refund",
            status: "Successful"
          })
        );
      }catch(e){}
    }
  });

  _save(EXT_STAKE_KEY, stakes);
  return count;
}

/* ---------- READ-ONLY ---------- */

function getExternalStakes(){
  return _load(EXT_STAKE_KEY);
}

function getExternalStakesByUser(userPiUID){
  return _load(EXT_STAKE_KEY).filter(s => s.userPiUID === userPiUID);
}

function getExternalStakesByProject(projectId){
  return _load(EXT_STAKE_KEY).filter(s => s.projectId === projectId);
    }
