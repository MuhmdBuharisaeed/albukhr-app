/* ===============================
   ALBUKHR – ADMIN EXTERNAL REVIEW
================================ */

document.addEventListener("DOMContentLoaded", () => {

  const body = document.getElementById("reviewBody");

  if(!body){
    console.error("reviewBody not found");
    return;
  }

  /* -------------------------------
     LOAD PENDING PROJECTS
  -------------------------------- */
  function loadReviews(){

    if(typeof getPendingExternalProjects !== "function"){
      body.innerHTML =
        `<tr><td colspan="5" class="empty">External engine not loaded</td></tr>`;
      return;
    }

    const list = getPendingExternalProjects();
    body.innerHTML = "";

    if(!list || list.length === 0){
      body.innerHTML =
        `<tr><td colspan="5" class="empty">No pending external projects</td></tr>`;
      return;
    }

    list.forEach(p => {
      const d = new Date(p.createdAt || Date.now());
      const date =
        d.toLocaleDateString() + " " +
        d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

      body.innerHTML += `
        <tr>
          <td>${date}</td>
          <td>
            <span class="badge external">external</span>
            <span class="badge pending">pending</span>
          </td>
          <td>
            <strong>${p.title || "Untitled"}</strong><br>
            <small>${p.projectId}</small>
          </td>
          <td>${p.owner || "—"}</td>
          <td>
            <button class="btn approve"
              data-id="${p.projectId}">
              Approve
            </button>
            <button class="btn reject"
              data-id="${p.projectId}">
              Reject
            </button>
          </td>
        </tr>
      `;
    });

    bindActions();
  }

  /* -------------------------------
     BIND ACTION BUTTONS
  -------------------------------- */
  function bindActions(){
    body.querySelectorAll(".approve").forEach(btn=>{
      btn.onclick = () => approveProject(btn.dataset.id);
    });

    body.querySelectorAll(".reject").forEach(btn=>{
      btn.onclick = () => rejectProject(btn.dataset.id);
    });
  }

  /* -------------------------------
     PERMISSION CHECK
  -------------------------------- */
  function canReview(){
    if(typeof getAdmin !== "function") return false;
    const admin = getAdmin();
    return admin && ["super_admin","review_admin"].includes(admin.role);
  }

  /* -------------------------------
     ACTIONS
  -------------------------------- */
  function approveProject(id){
    if(!canReview()){
      alert("Permission denied");
      return;
    }
    updateExternalStatus(id, "approved");
    loadReviews();
  }

  function rejectProject(id){
    if(!canReview()){
      alert("Permission denied");
      return;
    }
    updateExternalStatus(id, "rejected");
    loadReviews();
  }

  /* -------------------------------
     INIT
  -------------------------------- */
  loadReviews();

});
