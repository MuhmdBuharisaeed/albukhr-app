/* =========================================
   ALBUKHR WALLET CORE v8
   Unified • Safe • Project Compatible
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v8";
const SETTINGS_KEY = "albukhr_wallet_settings";

/* =========================================
   SAFE JSON
========================================= */

function safeParse(value,fallback){
try{
if(!value) return fallback;
return JSON.parse(value);
}catch{
return fallback;
}
}

function safeStringify(value){
try{
return JSON.stringify(value);
}catch{
return "[]";
}
}

/* =========================================
   SETTINGS
========================================= */

function getWalletSettings(){
return safeParse(
localStorage.getItem(SETTINGS_KEY),
{
feePercent:1,
dailyLimit:50
});
}

/* =========================================
   STORAGE
========================================= */

function getWithdrawals(){
const data = safeParse(
localStorage.getItem(WITHDRAW_KEY),
[]
);

return Array.isArray(data) ? data : [];
}

function saveWithdrawals(list){
localStorage.setItem(
WITHDRAW_KEY,
safeStringify(list)
);
}

/* =========================================
   PROJECT BREAKDOWN
========================================= */

function getProjectWalletBreakdown(){

if(typeof getAllStakesMerged !== "function"){
return [];
}

const stakes = getAllStakesMerged() || [];

const map = {};

stakes.forEach(s=>{

if(!s?.project) return;

if(!map[s.project]){
map[s.project] = {
project:s.project,
stake:0,
grossReward:0,
withdrawnReward:0,
withdrawnCapital:0
};
}

if(!s.capitalWithdrawn){
map[s.project].stake += Number(s.amount)||0;
}

const reward =
Number(s.reward)||0;

const withdrawn =
Number(s.withdrawnReward)||0;

map[s.project].grossReward += reward;
map[s.project].withdrawnReward += withdrawn;

});

return Object.values(map).map(p=>({

project:p.project,

stake:p.stake,

grossReward:p.grossReward,

withdrawnReward:p.withdrawnReward,

withdrawnCapital:p.withdrawnCapital,

netReward:
Math.max(
p.grossReward - p.withdrawnReward,
0
)

}));

}

/* =========================================
   GLOBAL SUMMARY
========================================= */

function getWalletSummary(){

const projects =
getProjectWalletBreakdown();

let totalStake=0;
let grossRewards=0;
let withdrawn=0;
let available=0;

projects.forEach(p=>{

totalStake += Number(p.stake)||0;
grossRewards += Number(p.grossReward)||0;
withdrawn += Number(p.withdrawnReward)||0;
available += Number(p.netReward)||0;

});

return {
totalStake,
grossRewards,
withdrawn,
available
};

}

/* =========================================
   DAILY LIMIT
========================================= */

function getTodayWithdrawTotal(){

const today =
new Date().toDateString();

return getWithdrawals()
.filter(w=>
new Date(w.timestamp)
.toDateString() === today
)
.reduce((sum,w)=>
sum + Number(w.grossAmount||0)
,0);

}

/* =========================================
   REWARD WITHDRAW
========================================= */

function requestWithdraw({
project,
amount,
walletAddress
}){

amount = Number(amount);

if(!amount || amount<=0){
return {error:"Invalid amount"};
}

const projects =
getProjectWalletBreakdown();

const target =
projects.find(
p=>p.project===project
);

if(!target){
return {error:"Project not found"};
}

if(amount > target.netReward){
return {error:"Insufficient balance"};
}

const settings =
getWalletSettings();

if(
getTodayWithdrawTotal()+amount >
settings.dailyLimit
){
return {
error:"Daily limit exceeded"
};
}

/* UPDATE STAKES */

const stakes =
getAllStakesMerged();

let remaining = amount;

stakes.forEach(s=>{

if(remaining<=0) return;
if(s.project !== project) return;

const available =
(Number(s.reward)||0) -
(Number(s.withdrawnReward)||0);

if(available>0){

const take =
Math.min(available,remaining);

s.withdrawnReward =
(Number(s.withdrawnReward)||0)
+ take;

remaining -= take;

}

});

const fee =
amount * (settings.feePercent/100);

const received =
amount - fee;

const history =
getWithdrawals();

history.push({

id:"RW-"+Date.now(),
type:"reward",
project,
grossAmount:amount,
fee,
received,
walletAddress:
walletAddress||"internal",
timestamp:Date.now()

});

saveWithdrawals(history);

recordTx({
type:"withdraw",
project,
amount,
fee
});

window.dispatchEvent(
new CustomEvent(
"walletUpdated"
)
);

return {
success:true,
grossAmount:amount,
fee,
received
};

}

/* =========================================
   CAPITAL WITHDRAW
========================================= */

function requestCapitalWithdraw(project){

if(typeof getProjectTotals !== "function"){
return {error:"Engine not ready"};
}

const totals =
getProjectTotals(project);

if(!totals?.stakes?.length){
return {error:"No stakes"};
}

let totalCapital = 0;

totals.stakes.forEach(s=>{

if(
typeof isStakeMatured==="function" &&
isStakeMatured(s) &&
!s.capitalWithdrawn
){

s.capitalWithdrawn = true;

s.withdrawnCapital =
(Number(s.withdrawnCapital)||0)
+ (Number(s.amount)||0);

totalCapital +=
Number(s.amount)||0;

}

});

if(totalCapital<=0){
return {
error:"No matured capital"
};
}

const tx = {

id:"CAP-"+Date.now(),
project,
grossAmount:totalCapital,
fee:0,
received:totalCapital,
timestamp:Date.now(),
type:"capital"

};

const list =
getWithdrawals();

list.push(tx);

saveWithdrawals(list);

recordTx({
type:"capital-withdraw",
project,
amount:totalCapital
});

window.dispatchEvent(
new CustomEvent(
"walletUpdated"
)
);

return tx;

}

/* =========================================
   HISTORY
========================================= */

function getWithdrawHistory(){

return getWithdrawals()
.sort((a,b)=>
b.timestamp-a.timestamp
);

}

/* =========================================
   DEV RESET
========================================= */

function clearWalletLedger(){

localStorage.removeItem(
WITHDRAW_KEY
);

}

function getProjectWalletBreakdown(){

if(typeof getAllStakesMerged !== "function"){
return [];
}

const stakes = getAllStakesMerged() || [];

const map = {};

stakes.forEach(s=>{

if(!s?.project) return;

if(!map[s.project]){
map[s.project] = {
project:s.project,
stake:0,
grossReward:0,
withdrawnReward:0,
withdrawnCapital:0
};
}

if(!s.capitalWithdrawn){
map[s.project].stake += Number(s.amount)||0;
}

const reward =
Number(s.reward)||0;

const withdrawn =
Number(s.withdrawnReward)||0;

map[s.project].grossReward += reward;
map[s.project].withdrawnReward += withdrawn;

});

return Object.values(map).map(p=>({

project:p.project,

stake:p.stake,

grossReward:p.grossReward,

withdrawnReward:p.withdrawnReward,

withdrawnCapital:p.withdrawnCapital,

netReward:
Math.max(
p.grossReward - p.withdrawnReward,
0
),

withdrawableCapital:
Math.max(
p.stake - p.withdrawnCapital,
0
)

}));

   }
