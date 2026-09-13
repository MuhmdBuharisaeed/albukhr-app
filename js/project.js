/* ALBUKHR PROJECT PAGE v3 — same UX, new architecture */
(function(){
"use strict";
const params=new URLSearchParams(location.search);
const PROJECT_NAME=params.get("project")||"Azman";
const CONFIG=getProjectConfig(PROJECT_NAME);
const $=id=>document.getElementById(id);
function alertUser(title,text){if(typeof showAlert==="function")showAlert(title,text);else window.alert(`${title}\n\n${text}`)}
$("txTitle").innerText=`${CONFIG.title} Transactions`;
document.title=`${CONFIG.title} • ALBUKHR`;
$("projectTitle").innerText=CONFIG.title;
$("projectDescription").innerText=CONFIG.desc;
$("infoTitle").innerText=`About ${CONFIG.title}`;
$("infoText").innerText=CONFIG.info;
$("stakeTitle").innerText=`Stake in ${CONFIG.title}`;
function openModal(){ $("amountInput").value="";$("minHint").innerText=`Minimum stake: ${getMinStake(PROJECT_NAME)} Pi`;$("durationSelect").innerHTML="";(CONFIG.durations||[30,60,90]).forEach(d=>{const o=document.createElement("option");o.value=d;o.textContent=`${d} Days`;$("durationSelect").appendChild(o)});$("stakeModal").style.display="flex"}
function closeModal(){$("stakeModal").style.display="none"} function closeSuccess(){$("successModal").style.display="none"} function openInfo(){$("infoModal").style.display="flex"} function closeInfo(){$("infoModal").style.display="none"} function closeWithdraw(){$("withdrawModal").style.display="none"} function openCapitalModal(){$("capitalModal").style.display="flex"} function closeCapitalModal(){$("capitalModal").style.display="none"}
async function openWithdrawModal(){$("availableBalance").innerText="Available: 0.00 Pi";$("withdrawModal").style.display="flex"}
async function confirmStake(){const amount=Number($("amountInput").value),duration=Number($("durationSelect").value);const btn=$("stakeModal").querySelector(".primary");if(!Number.isFinite(amount)||amount<getMinStake(PROJECT_NAME)){alertUser("Minimum Stake Required",`The minimum stake for this project is ${getMinStake(PROJECT_NAME)} Pi.`);return}btn.disabled=true;btn.innerText="Processing...";try{const r=await addStake({project:PROJECT_NAME,amount,duration});if(r?.error){alertUser("Stake Unavailable",r.error);return} $("successText").innerText=`You staked ${amount} Pi in ${CONFIG.title}`;closeModal();$("successModal").style.display="flex";await load()}catch(e){alertUser("Stake Failed",e.message||"Unable to create stake.")}finally{btn.disabled=false;btn.innerText="Confirm"}}
async function confirmWithdraw(){const r=await createWithdrawRequest({project:PROJECT_NAME,amount:Number($("withdrawAmount").value),wallet:$("walletAddress").value.trim(),type:"reward"});if(r?.error)alertUser("Withdrawal Blocked",r.error);else alertUser("Withdrawal Submitted","Your withdrawal request has been submitted.");}
async function confirmCapitalWithdraw(){const r=await withdrawCapital({project:PROJECT_NAME,amount:Number($("capitalWithdrawAmount").value)});if(r?.error)alertUser("Capital Withdrawal Blocked",r.error);else alertUser("Capital Withdrawal Submitted","Your capital withdrawal request has been submitted.");}
async function load(){try{const d=await getProjectTotals(PROJECT_NAME);$("aStake").innerText=(Number(d.stake)||0).toFixed(2)+" Pi";$("aReward").innerText=(Number(d.reward)||0).toFixed(2)+" Pi";$("projectHistory").innerHTML=`<div style="text-align:center;padding:20px;color:#777">${CONFIG.title}<br><br>No transactions yet</div>`;updateStakeStatus()}catch(e){console.warn("Project load:",e)}}
async function updateStakeStatus(){$("stakeStatus").innerText="Mainnet staking records are not currently available."}
window.manualRefresh=load;
window.openModal=openModal;window.closeModal=closeModal;window.closeSuccess=closeSuccess;window.openInfo=openInfo;window.closeInfo=closeInfo;window.openWithdrawModal=openWithdrawModal;window.closeWithdraw=closeWithdraw;window.openCapitalModal=openCapitalModal;window.closeCapitalModal=closeCapitalModal;window.confirmStake=confirmStake;window.confirmWithdraw=confirmWithdraw;window.confirmCapitalWithdraw=confirmCapitalWithdraw;
window.addEventListener("DOMContentLoaded",async()=>{try{await window.AlbukhrPiAuth?.ensurePiAuth();await load()}catch(e){console.warn("Project auth:",e)}})
})();
