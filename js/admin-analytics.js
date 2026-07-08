/* ===============================
   ADMIN ANALYTICS
=============================== */

/* ===============================
   LOAD ANALYTICS
=============================== */
async function loadAnalytics(){

try{

const payments =
await getWalletPayments();

let received = 0;
let sent = 0;
let totalFees = 0;

if(typeof supabaseClient !== "undefined"){

const { data: fees } =
await supabaseClient
.from("transactions")
.select("fee")
.eq("status","paid");

(fees || []).forEach(tx=>{

totalFees +=
Number(tx.fee || 0);

});

}

payments.forEach(tx=>{

const amount =
Number(tx.amount || 0);

if(tx.to === ALBUKHR_WALLET){

received += amount;

}else if(tx.from === ALBUKHR_WALLET){

sent += amount;

}

});

renderAnalytics({

received,
sent,
totalTransactions: payments.length,
netFlow: received - sent,
totalFees

});

}catch(error){

console.error(
"Analytics Error:",
error
);

}
}

/* ===============================
   RENDER ANALYTICS
=============================== */
function renderAnalytics(data){

const receivedBox =
document.getElementById("totalReceived");

const sentBox =
document.getElementById("totalSent");

const txBox =
document.getElementById("totalTransactions");

const flowBox =
document.getElementById("netFlow");

const feeBox =
document.getElementById("totalFees");

if(receivedBox){

receivedBox.innerText =
data.received.toFixed(2) + " Pi";

}

if(sentBox){

sentBox.innerText =
data.sent.toFixed(2) + " Pi";

}

if(txBox){

txBox.innerText =
data.totalTransactions;

}

if(flowBox){

flowBox.innerText =
data.netFlow.toFixed(2) + " Pi";

flowBox.style.color =
data.netFlow >= 0
? "green"
: "red";

}

if(feeBox){

feeBox.innerText =
(data.totalFees || 0).toFixed(2) + " Pi";

}

   }
