/* ===============================
   ALBUKHR WALLET PROJECTS LINK
================================ */

function loadAllProjectsToWallet(){
  // 1. Internal Projects
  const internalProjects = [
    { projectId: "AZMAN", name: "Azman Features Makers Lab", staked: 55, rewards: 9.6 },
    { projectId: "LAIBAIKA", name: "Laibaika Bakery Center", staked: 40, rewards: 6.2 },
    { projectId: "BASHAGRO", name: "Bash Agro", staked: 75, rewards: 12.5 },
    { projectId: "URBANMOB", name: "Urban Mobility", staked: 30, rewards: 5.0 },
    { projectId: "KHAIRAT", name: "Khairat Organic Fertilizer", staked: 50, rewards: 8.0 },
    { projectId: "HAUWAL", name: "Hauwal Sumonviter", staked: 60, rewards: 10.0 },
    { projectId: "RAHEEM", name: "Raheem Pharmacy", staked: 15, rewards: 2.4 }
  ];

  internalProjects.forEach(p=>{
    if(!getByProject(p.projectId).length){
      recordStake(p.projectId, p.staked, "internal");
    }
    if(p.rewards && p.rewards>0){
      recordReward(p.projectId, p.rewards);
    }
  });

  // 2. External Projects (Approved Only)
  const externalProjects = getExternalProjects().filter(p=>p.status==="approved");

  externalProjects.forEach(p=>{
    if(!getByProject(p.projectId).length){
      recordStake(p.projectId, p.staked || 0, "external");
    }
    if(p.rewards && p.rewards>0){
      recordReward(p.projectId, p.rewards);
    }
  });
}

/* Call this once wallet loads */
loadAllProjectsToWallet();
