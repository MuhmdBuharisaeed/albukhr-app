/* ===============================
   ALBUKHR – ADMIN EXTERNAL REVIEW
================================ */

const body = document.getElementById("reviewBody");

/* -------------------------------
   LOAD PENDING PROJECTS
-------------------------------- */
function loadReviews(){

  if(typeof getPendingExternalProjects !== "function"){
    body.innerHTML =
      `<tr><td colspan="5" class="empty">Engine not found</td></tr>`;
    return;
  }

  const list = getPendingExternalProjects();

  body.innerHTML = "";

  if(list.length === 0){
    body.innerHTML =
      `<tr><td colspan="5" class="empty">No pending external projects</td></tr>`;
    return;
  }

  list.forEach(p=>{
    const d = new Date(p.createdAt || Date.now());
    const date =
      d.toLocaleDateString() + " " +
      d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

    body.innerHTML += `
      <tr>
        <td>${date}</td>
        <td>
          <span class="badge external">external</span>
          <span class="badge pending">pending</span>
        </td>
        <td>
          <strong>${p.title}</strong><br>
          <small>${p.projectId}</small>
        </td>
        <td>${p.owner || "—"}</td>
        <td>
          <button class="btn approve"
            onclick="approveProject('${p.projectId}')">
            Approve
          </button>
          <button class="btn reject"
            onclick="rejectProject('${p.projectId}')">
            Reject
          </button>
        </td>
      </tr>
    `;
  });
}

/* -------------------------------
   ACTIONS
-------------------------------- */
function approveProject(id){
  if(!confirm("Approve this external project?")) return;
  updateExternalStatus(id, "approved");
  loadReviews();
}

function rejectProject(id){
  if(!confirm("Reject this external project?")) return;
  updateExternalStatus(id, "rejected");
  loadReviews();
}

/* -------------------------------
   INIT
-------------------------------- */
window.addEventListener("DOMContentLoaded", loadReviews);
