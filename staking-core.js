/* ==================================
   ALBUKHR – EXTERNAL STAKING CORE w/ AI VERIFICATION
   SAFE • VERIFIED • ESCROW
   ================================== */

const EXT_PROJECT_KEY = "albukhr_external_projects";
const EXT_STAKE_KEY   = "albukhr_external_stakes";

/* ---------- HELPERS ---------- */
function load(key){ return JSON.parse(localStorage.getItem(key) || "[]"); }
function save(key,data){ localStorage.setItem(key, JSON.stringify(data)); }

/* ---------- AI VERIFICATION SIMULATION ---------- */
async function verifyProjectOwner(userId, walletId){
    // Placeholder: AI logic or API call
    // Returns { verified: true|false, score: 0-100, notes: "" }
    // Real integration could call your AI backend
    const wallet = load("pi_wallets").find(w => w.userId === userId && w.walletId === walletId) || {balance:0};
    const score  = wallet.balance >= 10 ? 95 : 40; // example: min 10 Pi
    return { verified: score >= 50, score, notes: score >=50 ? "" : "Insufficient PI" };
}

/* ---------- PROJECTS ---------- */
function getExternalProjects(){ return load(EXT_PROJECT_KEY); }
function getExternalProject(id){ return getExternalProjects().find(p => p.projectId === id); }

/* ---------- ADD PROJECT (with AI verification) ---------- */
async function addExternalProject(projectData){
    const { userId, walletId, name, description } = projectData;

    // Step 1: Verify owner
    const ai = await verifyProjectOwner(userId, walletId);
    if(!ai.verified) throw `Verification failed: ${ai.notes} (score ${ai.score})`;

    // Step 2: Save project
    const projects = getExternalProjects();
    const project = {
        projectId: "EXT-" + Date.now(),
        name, description,
        userId, walletId,
        totalStaked: 0,
        status: "active",
        milestones: [],
        created: Date.now()
    };
    projects.push(project);
    save(EXT_PROJECT_KEY, projects);
    return project;
}

/* ---------- STAKING / ESCROW ---------- */
function stakeExternal(projectId, userPiUID, amount){
    const projects = getExternalProjects();
    const project  = projects.find(p => p.projectId === projectId);
    if(!project) throw "Project not found";
    if(project.status !== "active") throw "Project not active";

    const stake = {
        stakeId: "STK-" + Date.now(),
        projectId,
        userPiUID,
        amount,
        status: "frozen", // escrow
        timestamp: Date.now()
    };

    const stakes = load(EXT_STAKE_KEY);
    stakes.push(stake);
    save(EXT_STAKE_KEY, stakes);

    project.totalStaked += amount;
    save(EXT_PROJECT_KEY, projects);
    return stake;
}

/* ---------- RELEASE / MILESTONE ---------- */
function releaseMilestone(projectId, milestoneId){
    const projects = getExternalProjects();
    const project = projects.find(p => p.projectId === projectId);
    if(!project) throw "Project not found";

    const milestone = project.milestones.find(m => m.id === milestoneId);
    if(!milestone || milestone.released) throw "Invalid milestone";

    milestone.released = true;
    save(EXT_PROJECT_KEY, projects);
    return milestone;
}

/* ---------- EMERGENCY FREEZE ---------- */
function freezeProject(projectId, reason=""){
    const projects = getExternalProjects();
    const project = projects.find(p => p.projectId === projectId);
    if(!project) throw "Project not found";

    project.status = "frozen";
    project.freezeReason = reason;
    save(EXT_PROJECT_KEY, projects);
}

/* ---------- REFUND ---------- */
function refundProject(projectId){
    const stakes = load(EXT_STAKE_KEY);
    const affected = stakes.filter(s => s.projectId === projectId && s.status === "frozen");
    affected.forEach(s => s.status = "refunded");
    save(EXT_STAKE_KEY, stakes);
    return affected.length;
}

/* ---------- READ-ONLY ---------- */
function getExternalStakesByUser(userPiUID){
    return load(EXT_STAKE_KEY).filter(s => s.userPiUID === userPiUID);
}
function getExternalStakesByProject(projectId){
    return load(EXT_STAKE_KEY).filter(s => s.projectId === projectId);
}

/* ---------- HOME DASHBOARD TOTALS ---------- */
function getExternalTotals(){
    const stakes = load(EXT_STAKE_KEY);
    let totalStake = 0;
    stakes.forEach(s => totalStake += Number(s.amount)||0);
    return { totalStake };
}

/* ---------- RECENT TRANSACTIONS ---------- */
function getExternalRecent(limit=3){
    return load(EXT_STAKE_KEY)
        .slice().reverse()
        .slice(0, limit);
   }
