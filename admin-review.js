/* ===============================
   ALBUKHR – ADMIN EXTERNAL REVIEW
================================ */

const tableBody = document.getElementById("reviewBody");
const statusFilter = document.getElementById("statusFilter");

/* -------------------------------
   LOAD PENDING / ALL PROJECTS
-------------------------------- */
function getReviewProjects(){
  if(typeof getExternalProjects !== "function") return [];
  return getExternalProjects();
}

/* -------------------------------
   RENDER TABLE
-------------------------------- */
function renderReview(){
  const status = statusFilter.value;
  let projects = getReviewProjects();

  if(status){
    projects = projects.filter(p => p.status === status);
  }

  tableBody.innerHTML = "";

  if(projects.length === 0){
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          No external projects found
        </td>
      </tr>
    `;
    return;
  }

  projects.forEach(p=>{
    const d = new Date(p.createdAt || Date.now());
    const date =
      d.toLocaleDateString() + " " +
      d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

    tableBody.innerHTML += `
      <tr>
        <td>${date}</td>
        <td>${p.projectId}</td>
        <td>${p.title}</td>
        <td>${p.owner || "-"}</td>
        <td class="${statusClass(p.status)}">${p.status}</td>
        <td>
          ${actionButtons(p)}
        </td>
      </tr>
    `;
  });
}

/* -------------------------------
   STATUS COLORS
-------------------------------- */
function statusClass(s){
  if(s === "approved") return "status-ok";
  if(s === "rejected") return "status-refunded";
  return "";
}

/* -------------------------------
   ACTION BUTTONS
-------------------------------- */
function actionButtons(p){
  if(p.status !== "pending"){
    return `<span class="badge core">Locked</span>`;
  }

  return `
    <button onclick="approveProject('${p.projectId}')"
      style="padding:6px 10px;border-radius:8px;
      background:#0f7a3d;color:#fff;border:none">
      Approve
    </button>

    <button onclick="rejectProject('${p.projectId}')"
      style="padding:6px 10px;border-radius:8px;
      background:#eee;color:#333;border:none">
      Reject
    </button>
  `;
}

/* -------------------------------
   ACTIONS
-------------------------------- */
function approveProject(id){
  if(!confirm("Approve this external project?")) return;
  updateExternalStatus(id, "approved");
  renderReview();
}

function rejectProject(id){
  if(!confirm("Reject this external project?")) return;
  updateExternalStatus(id, "rejected");
  renderReview();
}

/* -------------------------------
   INIT
-------------------------------- */
statusFilter.addEventListener("change", renderReview);
renderReview();
