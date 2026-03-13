/* ======================================
ALBUKHR ANTI-RUG PROTECTION ENGINE
====================================== */

/* minimum liquidity that must remain */

const ALBUKHR_MIN_RESERVE_PERCENT = 30;


/* ======================================
CHECK IF WITHDRAW IS SAFE
====================================== */

function checkRugRisk(project, withdrawAmount){

if(typeof getProjectTreasuryStatus !== "function")
return {allowed:true};

const treasury = getProjectTreasuryStatus(project);

const liquidity = Number(treasury.liquidity) || 0;

const reserveLimit =
(liquidity * ALBUKHR_MIN_RESERVE_PERCENT) / 100;

/* calculate remaining liquidity */

const remaining = liquidity - withdrawAmount;

/* rug protection */

if(remaining < reserveLimit){

return {

allowed:false,

reason:
"Anti-Rug Protection: withdrawal exceeds safety reserve."

};

}

return {allowed:true};

}
