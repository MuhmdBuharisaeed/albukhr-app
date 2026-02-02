/* ===============================
   ALBUKHR – PI DAPP SERVICE ENGINE
================================ */

const DAPP_KEY = "albukhr_pi_dapp_requests";
const DAPP_LIMIT = 10;

/* SERVICE PRICING */
const PRICING = {
  pi_studio: {
    label: "Pi Studio Assistance",
    fee: "Flexible",
  },
  developer: {
    label: "Developer-built dApp",
    fee: "Premium",
  }
};

/* -------------------------------
   GET ALL REQUESTS
-------------------------------- */
function getDappRequests(){
  return JSON.parse(localStorage.getItem(DAPP_KEY)) || [];
}

/* -------------------------------
   CHECK LIMIT
-------------------------------- */
function submissionClosed(){
  return getDappRequests().length >= DAPP_LIMIT;
}

/* -------------------------------
   SUBMIT REQUEST
-------------------------------- */
function submitDappRequest(){

  if(submissionClosed()){
    document.getElementById("limitNotice").style.display = "block";
    return;
  }

  const data = {
    requestId: "DAPP-" + Date.now(),
    piUser: piUser.value.trim(),
    projectName: projectName.value.trim(),
    serviceType: serviceType.value,
    description: description.value.trim(),
    receipt: receipt.value.trim(),
    status: "pending",
    createdAt: Date.now()
  };

  if(
    !data.piUser ||
    !data.projectName ||
    !data.serviceType ||
    !data.description ||
    !data.receipt ||
    !agree.checked
  ){
    alert("Please complete all required fields");
    return;
  }

  const list = getDappRequests();
  list.push(data);
  localStorage.setItem(DAPP_KEY, JSON.stringify(list));

  alert("✅ Your request has been submitted for review");
  window.location.href = "services.html";
}

/* -------------------------------
   UI LOCK IF FULL
-------------------------------- */
window.addEventListener("DOMContentLoaded", ()=>{
  if(submissionClosed()){
    document.getElementById("submitBtn").classList.add("disabled");
    document.getElementById("limitNotice").style.display = "block";
  }
});
