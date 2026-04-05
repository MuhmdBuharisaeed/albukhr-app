/* ===================== DASHBOARD ===================== */

function calculateTotals(){

let totalStake = 0;
let totalReward = 0;

if(typeof getAllStakesMerged === "function"){

const stakes = getAllStakesMerged();

stakes.forEach(s=>{

totalStake += Number(s.amount)||0;

const remaining =
(Number(s.reward)||0) -
(Number(s.withdrawnReward)||0);

totalReward += Math.max(0,remaining);

});

}

if(document.getElementById("totalStaking")){

document.getElementById("totalStaking")
.textContent =
totalStake.toFixed(2)+" Pi";

}

if(document.getElementById("totalRewards")){

document.getElementById("totalRewards")
.textContent =
totalReward.toFixed(2)+" Pi";

}

}


/* ===================== HISTORY ===================== */

function renderHistory(project=null){

if(typeof getTransactions !== "function") return;

const txs =
getTransactions()
.filter(tx =>
!project ||
tx.project === project
)
.reverse();

const container =
document.getElementById("transactionHistory");

if(!container) return;

container.innerHTML = "";

txs.forEach(tx=>{

const div =
document.createElement("div");

div.className="history-item";

div.innerHTML = `
<strong>${tx.project}</strong><br>
${tx.type}: ${Number(tx.amount).toFixed(2)} Pi<br>
<small>
${new Date(tx.timestamp).toLocaleString()}
</small>
`;

container.appendChild(div);

});

}


/* ===================== INIT ===================== */

document.addEventListener(
"DOMContentLoaded",
function(){

calculateTotals();
renderHistory();

setInterval(()=>{
calculateTotals();
},3000);

}
);
