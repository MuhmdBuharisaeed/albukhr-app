/* ===============================
   ALBUKHR – PI DAPP SERVICE ENGINE
================================ */

const DAPP_KEY = "albukhr_pi_dapp_requests";
const DAPP_LIMIT = 10;

/* -------------------------------
   GET ALL REQUESTS
-------------------------------- */
function getDappRequests(){
  return JSON.parse(localStorage.getItem(DAPP_KEY)) || [];
}

/* -------------------------------
   CHECK GLOBAL LIMIT
-------------------------------- */
function submissionClosed(){
  return getDappRequests().length >= DAPP_LIMIT;
}

/* -------------------------------
   CHECK USER PENDING
-------------------------------- */
function userHasPending(piUser){
  return getDappRequests().some(
    r => r.piUser === piUser && r.status === "pending"
  );
}

/* -------------------------------
   SUBMIT REQUEST
-------------------------------- */
function submitDappRequest(){

  if(submissionClosed()){
    document.getElementById("limitNotice").style.display = "block";
    return;
  }

  const fileInput = document.getElementById("receiptImg");
  const file = fileInput.files[0];

  if(!file){
    alert("Please upload payment receipt screenshot");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(){
    const data = {
      id: "DAPP-" + Date.now(),
      piUser: piUser.value.trim(),
      projectName: projectName.value.trim(),
      serviceType: serviceType.value,
      description: description.value.trim(),
      receiptRef: receiptRef.value.trim(),
      receiptImg: reader.result,   // ✅ BASE64 IMAGE
      status: "pending",
      notifyUser: false,
      createdAt: Date.now()
    };

    if(
      !data.piUser ||
      !data.projectName ||
      !data.serviceType ||
      !data.description ||
      !data.receiptRef ||
      !agree.checked
    ){
      alert("Please complete all required fields");
      return;
    }

    const list = getDappRequests();
    list.push(data);
    localStorage.setItem(DAPP_KEY, JSON.stringify(list));

    // LOCK USER FROM RESUBMIT
    localStorage.setItem("albukhr_dapp_active", "true");

    window.location.href = "my-dapp-requests.html";
  };

  reader.readAsDataURL(file);
}

/* -------------------------------
   ADMIN ACTIONS
-------------------------------- */
function approveDapp(id){
  updateDappStatus(id, "approved");
}

function rejectDapp(id){
  updateDappStatus(id, "rejected");
}

function updateDappStatus(id,status){
  let list = getDappRequests();

  list = list.map(r=>{
    if(r.id === id){
      r.status = status;
      if(status === "approved"){
        r.telegramUnlocked = true;
        r.approvedAt = Date.now();
      }
      if(status === "rejected"){
        r.rejectedAt = Date.now();
      }
    }
    return r;
  });

  localStorage.setItem(DAPP_KEY, JSON.stringify(list));
}

/* -------------------------------
   UI LOCK IF FULL
-------------------------------- */
window.addEventListener("DOMContentLoaded", ()=>{
  if(submissionClosed()){
    const btn = document.getElementById("submitBtn");
    if(btn) btn.classList.add("disabled");
    const notice = document.getElementById("limitNotice");
    if(notice) notice.style.display = "block";
  }
});
