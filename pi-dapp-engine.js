/* ===============================
   ALBUKHR – PI DAPP SERVICE ENGINE
================================ */

const KEY = "albukhr_pi_dapp_requests";
const LIMIT = 10;

/* -------------------------------
   GET ALL REQUESTS
-------------------------------- */
function getAllRequests(){
  return JSON.parse(localStorage.getItem(KEY)) || [];
}

/* -------------------------------
   CHECK LIMIT
-------------------------------- */
function isLimitReached(){
  return getAllRequests().filter(r=>r.status==="pending").length >= LIMIT;
}

/* -------------------------------
   SUBMIT REQUEST
-------------------------------- */
function submitDappRequest(){

  if(isLimitReached()){
    document.getElementById("limitNotice").style.display = "block";
    document.getElementById("submitBtn").classList.add("disabled");
    return;
  }

  const data = {
    id: "DAPP-"+Date.now(),
    piUser: piUser.value.trim(),
    projectName: projectName.value.trim(),
    serviceType: serviceType.value,
    description: description.value.trim(),
    receipt: receipt.value.trim(),
    status: "pending",
    createdAt: Date.now()
  };

  if(!data.piUser || !data.projectName || !data.serviceType ||
     !data.description || !data.receipt || !agree.checked){
    alert("Please complete all required fields");
    return;
  }

  const list = getAllRequests();
  list.push(data);
  localStorage.setItem(KEY, JSON.stringify(list));

  alert("Request submitted for admin review");
  window.location.href = "services.html";
}

/* -------------------------------
   INIT
-------------------------------- */
if(isLimitReached()){
  document.getElementById("submitBtn").classList.add("disabled");
  document.getElementById("limitNotice").style.display = "block";
}
