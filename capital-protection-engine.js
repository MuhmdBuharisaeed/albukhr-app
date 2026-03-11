/* =========================================
   ALBUKHR CAPITAL PROTECTION ENGINE v1
   Protects investor funds & ecosystem stability
========================================= */

const ALBUKHR_PROTECTION = {

MAX_WITHDRAW_PERCENT:0.25,     // 25% max withdraw
MIN_LIQUIDITY_RATIO:0.30,      // 30% reserve
MAX_ROI:40,                    // ROI safety cap
PANIC_THRESHOLD:0.40           // 40% withdraw spike

};

/* =========================================
   LIQUIDITY SAFETY CHECK
========================================= */

function canWithdrawCapital(project, amount){

const treasury = getProjectTreasuryStatus(project);

const liquidity = treasury.liquidity || 0;

const reserve = liquidity * ALBUKHR_PROTECTION.MIN_LIQUIDITY_RATIO;

if(amount > (liquidity - reserve)){

return {
allowed:false,
reason:"Liquidity protection triggered"
};

}

return {allowed:true};

}

/* =========================================
   ROI PROTECTION
========================================= */

function validateProjectROI(roi){

if(roi > ALBUKHR_PROTECTION.MAX_ROI){

return {
allowed:false,
reason:"ROI exceeds safe threshold"
};

}

return {allowed:true};

}

/* =========================================
   WITHDRAW SPIKE DETECTION
========================================= */

function detectWithdrawPanic(project){

if(typeof getWithdrawHistory !== "function") return false;

const history = getWithdrawHistory()
.filter(tx => tx.project === project);

const lastHour =
Date.now() - (60 * 60 * 1000);

const recent =
history.filter(tx => tx.timestamp > lastHour);

if(!recent.length) return false;

const total =
recent.reduce((sum,tx)=>sum+Number(tx.grossAmount||0),0);

const treasury =
getProjectTreasuryStatus(project);

const liquidity = treasury.liquidity || 0;

if(liquidity === 0) return false;

const ratio = total / liquidity;

return ratio > ALBUKHR_PROTECTION.PANIC_THRESHOLD;

}

/* =========================================
   GLOBAL PROTECTION CHECK
========================================= */

function runCapitalProtection(project, amount){

/* ROI CHECK */

const projectData =
typeof getMarketplaceProjects === "function"
? getMarketplaceProjects().find(p => p.name === project)
: null;

if(projectData){

const roiCheck =
validateProjectROI(projectData.roi || 0);

if(!roiCheck.allowed){
return roiCheck;
}

}

/* LIQUIDITY CHECK */

const liquidityCheck =
canWithdrawCapital(project, amount);

if(!liquidityCheck.allowed){
return liquidityCheck;
}

/* PANIC DETECTION */

if(detectWithdrawPanic(project)){

return {
allowed:false,
reason:"Temporary withdraw freeze (panic protection)"
};

}

return {allowed:true};

}
