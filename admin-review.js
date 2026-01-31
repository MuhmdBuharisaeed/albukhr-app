/* ===============================
   ALBUKHR ADMIN – EXTERNAL REVIEW
================================ */

const body = document.getElementById("reviewBody");

function renderReviews(){

  if(typeof getPendingExternalProjects !== "function"){
    body.innerHTML =
      `<tr><td colspan="5" class="empty">Engine not available</td></tr>`;
    return;
  }

  const projects = getPendingExternalProjects();
  body.innerHTML = "";

  if(projects.length === 0){
    body.innerHTML =
      `<tr><td colspan="5" class="empty">No pending external projects</td></tr>`;
    return;
  }

  projects.forEach(p=>{
    const d = new Date(p.createdAt || Date.now());
    const date =
      d.toLocaleDateString() + " " +
      d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

    body.innerHTML += `
      <tr>
        <td>${date}</td>
        <td>
          <span class="badge external">External</span>
          <span class="badge pending">Pending</span>
        </td>
        <td>${p.title}</td>
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
  if(confirm("Approve this external project?")){
    updateExternalStatus(id, "approved");
    renderReviews();
  }
}

function rejectProject(id){
  if(confirm("Reject this external project?")){
    updateExternalStatus(id, "rejected");
    renderReviews();
  }
}

renderReviews();
