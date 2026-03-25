/* =====================================
ALBUKHR WALLET – ESCROW ENGINE v2
Safe • Capital Compatible • Recovery
===================================== */

const ESCROW_KEY = "albukhr_escrow_pool_v2";

const defaultEscrow = {
totalLocked:0,
records:[]
};

/* ===============================
SAFE PARSE
=============================== */

function safeEscrowParse(){

try{
return JSON.parse(
localStorage.getItem(ESCROW_KEY)
) || defaultEscrow;
}catch{
return defaultEscrow;
}

}

/* ===============================
INIT
=============================== */

function initEscrow(){

if(!localStorage.getItem(ESCROW_KEY)){
localStorage.setItem(
ESCROW_KEY,
JSON.stringify(defaultEscrow)
);
}

}

/* ===============================
GET
=============================== */

function getEscrow(){

return safeEscrowParse();

}

/* ===============================
SAVE
=============================== */

function saveEscrow(escrow){

localStorage.setItem(
ESCROW_KEY,
JSON.stringify(escrow)
);

}

/* ===============================
LOCK FUNDS
=============================== */

function lockToEscrow(
project,
amount,
source="wallet"
){

amount = Number(amount);

if(!amount || amount<=0){
return {error:"Invalid amount"};
}

const wallet = getWallet();

if(wallet.balance < amount){
return {error:"Insufficient balance"};
}

wallet.balance -= amount;

wallet.transactions.push({

type:"escrow-lock",
project,
amount,
timestamp:Date.now()

});

saveWallet(wallet);

const escrow = getEscrow();

escrow.totalLocked += amount;

escrow.records.push({

id:"ESC-"+Date.now(),
project,
amount,
status:"locked",
source,
timestamp:Date.now()

});

saveEscrow(escrow);

return {success:true};

}

/* ===============================
RELEASE ESCROW
=============================== */

function releaseEscrow(project){

const escrow = getEscrow();

let released = 0;

escrow.records.forEach(r=>{

if(
r.project === project &&
r.status === "locked"
){

r.status = "released";
released += Number(r.amount)||0;

}

});

escrow.totalLocked -= released;

saveEscrow(escrow);

return {
success:true,
released
};

}

/* ===============================
REFUND ESCROW
=============================== */

function refundEscrow(project){

const escrow = getEscrow();

const wallet = getWallet();

let refunded = 0;

escrow.records.forEach(r=>{

if(
r.project === project &&
r.status === "locked"
){

r.status = "refunded";

wallet.balance += Number(r.amount)||0;

refunded += Number(r.amount)||0;

}

});

escrow.totalLocked -= refunded;

wallet.transactions.push({

type:"escrow-refund",
project,
amount:refunded,
timestamp:Date.now()

});

saveWallet(wallet);

saveEscrow(escrow);

return {
success:true,
refunded
};

}

/* ===============================
PROJECT ESCROW
=============================== */

function getProjectEscrow(project){

const escrow = getEscrow();

return escrow.records
.filter(r=>r.project===project);

}

/* ===============================
TOTAL PROJECT LOCKED
=============================== */

function getProjectLocked(project){

const list =
getProjectEscrow(project);

let total = 0;

list.forEach(r=>{

if(r.status === "locked"){
total += Number(r.amount)||0;
}

});

return total;

}

/* ===============================
GLOBAL LOCKED
=============================== */

function getTotalEscrow(){

return getEscrow().totalLocked || 0;

}

/* ===============================
CLEAR ESCROW (DEV)
=============================== */

function clearEscrow(){

localStorage.removeItem(
ESCROW_KEY
);

}

/* INIT */

initEscrow();
