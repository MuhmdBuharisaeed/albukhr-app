/* =====================================
   ALBUKHR – PI dApp SERVICE ENGINE
   Authoritative Version
===================================== */

const DAPP_KEY = "albukhr_dapp_requests";
const DAPP_LIMIT = 10;

/* -------------------------------------
   HELPERS
------------------------------------- */
function getDappRequests(){
  return JSON.parse(localStorage.getItem(DAPP_KEY)) || [];
}

function saveDappRequests(list){
  localStorage.setItem(DAPP_KEY, JSON.stringify(list));
}

/* -------------------------------------
   CHECK IF USER HAS PENDING REQUEST
------------------------------------- */
function userHasPending(piUser){
  return getDappRequests().some(
    r => r.piUser === piUser && r.status === "pending"
  );
}

/* -------------------------------------
   SUBMISSION LIMIT
------------------------------------- */
function submissionClosed(){
  return getDappRequests().length >= DAPP_LIMIT;
}

/* -------------------------------------
   MAIN SUBMIT FUNCTION
------------------------------------- */
function submitDappRequest(){

  if(submissionClosed()){
    document.getElementById("limitNotice").style.display = "block";
    return;
  }

  const piUser = document.getElementById("piUser").value.trim();
  const projectName = document.getElementById("projectName").value.trim();
  const serviceType = document.getElementById("serviceType").value;
  const description = document.getElementById("description").value.trim();
  const receiptRef = document.getElementById("receiptRef").value.trim();
  const receiptImgInput = document.getElementById("receiptImg");
  const agree = document.getElementById("agree").checked;

  if(
    !piUser ||
    !projectName ||
    !serviceType ||
    !description ||
    !receiptRef ||
    !agree
  ){
    alert("Please complete all required fields");
    return;
  }

  if(userHasPending(piUser)){
    alert(
      "⏳ You already have a pending request.\n" +
      "Please wait for admin approval or rejection."
    );
    window.location.href = "my-dapp-requests.html";
    return;
  }

  /* ---------------------------------
     HANDLE RECEIPT IMAGE
  --------------------------------- */
  if(!receiptImgInput.files.length){
    alert("Please upload payment receipt image");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(){
    const receiptImage = reader.result;

    const request = {
      id: "DAPP-" + Date.now(),
      piUser,
      projectName,
      serviceType,
      description,
      receiptRef,
      receiptImage,
      status: "pending",
      adminNote: "",
      telegramUnlocked: false,
      createdAt: Date.now()
    };

    const list = getDappRequests();
    list.push(request);
    saveDappRequests(list);

    alert("✅ Your dApp request has been submitted for review");

    /* redirect user to status page */
    window.location.href = "my-dapp-requests.html";
  };

  reader.readAsDataURL(receiptImgInput.files[0]);
}

/* -------------------------------------
   UI LOCK IF USER HAS PENDING
------------------------------------- */
window.addEventListener("DOMContentLoaded", ()=>{

  const piUserInput = document.getElementById("piUser");
  const submitBtn = document.getElementById("submitBtn");

  if(!piUserInput || !submitBtn) return;

  piUserInput.addEventListener("blur", ()=>{
    const user = piUserInput.value.trim();
    if(!user) return;

    if(userHasPending(user)){
      submitBtn.classList.add("disabled");
      submitBtn.innerText = "Pending Review";
      submitBtn.disabled = true;

      alert(
        "⏳ You already have a pending dApp request.\n" +
        "Please wait for admin decision."
      );

      window.location.href = "my-dapp-requests.html";
    }
  });

  if(submissionClosed()){
    submitBtn.classList.add("disabled");
    submitBtn.disabled = true;
    document.getElementById("limitNotice").style.display = "block";
  }
});
