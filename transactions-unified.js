/* ======================================
ALBUKHR – UNIFIED TRANSACTIONS LAYER
====================================== */

function getAllTransactionsUnified(){

let txs = [];

/* ===============================
INTERNAL STAKES
=============================== */

try{

const internal =
JSON.parse(
localStorage.getItem("albukhr_stakes")
) || [];

internal.forEach(s=>{

txs.push({

source:"internal",
projectId: s.project,
user: s.user || "internal",
wallet: s.wallet || null,
amount: Number(s.amount) || 0,
status: s.status || "Successful",
timestamp: s.timestamp || Date.now(),
type:"stake"

});

});

}catch(e){}


/* ===============================
EXTERNAL PROJECTS
=============================== */

try{

const external =
JSON.parse(
localStorage.getItem("albukhr_external_projects")
) || [];

external.forEach(s=>{

txs.push({

source:"external",
projectId: s.projectId || s.project,
user: s.userPiUID || "external",
wallet: s.wallet || null,
amount: Number(s.amount) || 0,
status: s.status || "Successful",
timestamp: s.timestamp || Date.now(),
type:"stake"

});

});

}catch(e){}


/* ===============================
CORE TRANSACTIONS
=============================== */

try{

const core =
JSON.parse(
localStorage.getItem("albukhr_transactions")
) || [];

core.forEach(t=>{

txs.push({

source:"core",
projectId: t.project || t.projectId || "-",
user: t.user || "-",
wallet: t.meta?.wallet || null,
fee: Number(t.meta?.fee || 0),
amount: Number(t.amount) || 0,
status: t.status || "Successful",
timestamp: t.timestamp || Date.now(),
type:(t.type || "stake").toLowerCase()

});

});

}catch(e){}


/* SORT */

return txs.sort((a,b)=>b.timestamp - a.timestamp);

}
