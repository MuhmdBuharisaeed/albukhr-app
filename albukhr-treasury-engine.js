/* =========================================
   ALBUKHR TREASURY ENGINE v1
   Ecosystem Financial Control Layer
========================================= */

const TREASURY_MAIN_KEY = "albukhr_ecosystem_treasury";

/* =========================================
   STORAGE
========================================= */

function getEcosystemTreasury(){

try{

return JSON.parse(
localStorage.getItem(TREASURY_MAIN_KEY)
) || {

balance:0,
reserve:0,
profitPool:0,
created:Date.now()

};

}catch{

return {
balance:0,
reserve:0,
profitPool:0,
created:Date.now()
};

}

}

function saveEcosystemTreasury(data){

localStorage.setItem(
TREASURY_MAIN_KEY,
JSON.stringify(data)
);

}

/* =========================================
   ADD FUNDS TO TREASURY
========================================= */

function addTreasuryFunds(amount, source="system"){

amount = Number(amount);

if(!amount || amount <= 0){
return {error:"Invalid treasury amount"};
}

const treasury = getEcosystemTreasury();

treasury.balance += amount;

/* 20% goes to reserve */

const reserveShare = amount * 0.20;

treasury.reserve += reserveShare;

/* 10% profit pool */

const profitShare = amount * 0.10;

treasury.profitPool += profitShare;

saveEcosystemTreasury(treasury);

return {
success:true,
balance:treasury.balance
};

}

/* =========================================
   TREASURY SUPPORT TO PROJECT
========================================= */

function fundProjectFromTreasury(project, amount){

amount = Number(amount);

const treasury = getEcosystemTreasury();

if(treasury.balance < amount){
return {error:"Treasury insufficient"};
}

treasury.balance -= amount;

saveEcosystemTreasury(treasury);

/* add liquidity to project */

if(typeof addProjectLiquidity === "function"){

addProjectLiquidity(project, amount);

}

return {
success:true
};

}

/* =========================================
   EMERGENCY RESERVE USE
========================================= */

function useEmergencyReserve(project, amount){

amount = Number(amount);

const treasury = getEcosystemTreasury();

if(treasury.reserve < amount){
return {error:"Reserve insufficient"};
}

treasury.reserve -= amount;

saveEcosystemTreasury(treasury);

/* support project */

if(typeof addProjectLiquidity === "function"){

addProjectLiquidity(project, amount);

}

return {
success:true
};

}

/* =========================================
   PROFIT DISTRIBUTION
========================================= */

function distributeTreasuryProfits(){

const treasury = getEcosystemTreasury();

if(treasury.profitPool <= 0)
return;

if(typeof getProjects !== "function")
return;

const projects = getProjects();

const share =
treasury.profitPool / projects.length;

projects.forEach(project => {

if(typeof addProjectLiquidity === "function"){

addProjectLiquidity(project.name, share);

}

});

treasury.profitPool = 0;

saveEcosystemTreasury(treasury);

}

/* =========================================
   TREASURY STATUS
========================================= */

function getTreasuryStatus(){

const treasury = getEcosystemTreasury();

return {

balance:treasury.balance,
reserve:treasury.reserve,
profitPool:treasury.profitPool

};

  }
