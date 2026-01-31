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


const list = document.getElementById("list");

function renderReview(){
  const pending = getPendingExternalProjects();

  list.innerHTML = "";

  if(pending.length === 0){
    list.innerHTML =
      "<p style='color:#777;font-size:13px'>No pending projects</p>";
    return;
  }

  pending.forEach(p=>{
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div class="title">${p.title}</div>
      <div class="meta">
        Owner: ${p.owner}<br>
        Invite: ${p.invite || "-"}
      </div>

      <div class="btns">
        <button class="btn approve"
          onclick="approve('${p.projectId}')">Approve</button>
        <button class="btn reject"
          onclick="reject('${p.projectId}')">Reject</button>
      </div>
    `;

    list.appendChild(div);
  });
}

function approve(id){
  updateExternalStatus(id,"approved");
  renderReview();
}

function reject(id){
  updateExternalStatus(id,"rejected");
  renderReview();
}

renderReview();
