/* ===============================
   ALBUKHR – ADMIN REVIEW LOGIC
================================ */

/* BASIC ADMIN GUARD (TEMP) */
const ADMIN_KEY = "albukhr_admin_access";

/* ❗ TEMP: enable admin manually
   localStorage.setItem("albukhr_admin_access","true");
*/

if(localStorage.getItem(ADMIN_KEY) !== "true"){
  document.body.innerHTML = `
    <div style="padding:30px;text-align:center">
      <h3>⛔ Access Denied</h3>
      <p>Admin access required</p>
    </div>`;
  throw new Error("Not admin");
}


/* -------------------------------
   LOAD PENDING PROJECTS
-------------------------------- */
function loadPendingReviews(){

  const container = document.getElementById("list");
  const projects = getPendingExternalProjects();

  if(projects.length === 0){
    container.innerHTML = `
      <div style="text-align:center;color:#777">
        No pending external projects
      </div>`;
    return;
  }

  container.innerHTML = "";

  projects.forEach(p=>{
    container.innerHTML += `
      <div class="card">
        <div class="title">${p.title}</div>
        <div class="meta">
          👤 ${p.owner}<br>
          🆔 ${p.projectId}<br>
          📌 ${p.category}<br>
          ⏱ ${new Date(p.createdAt).toLocaleString()}
        </div>

        <div class="btns">
          <button class="btn approve"
            onclick="approveProject('${p.projectId}')">
            Approve
          </button>

          <button class="btn reject"
            onclick="rejectProject('${p.projectId}')">
            Reject
          </button>
        </div>
      </div>
    `;
  });
}


/* -------------------------------
   APPROVE
-------------------------------- */
function approveProject(id){

  if(!confirm("Approve this project and lock escrow?")) return;

  updateExternalStatus(id,"approved");

  alert("Project approved & escrow locked");
  loadPendingReviews();
}


/* -------------------------------
   REJECT
-------------------------------- */
function rejectProject(id){

  if(!confirm("Reject this project?")) return;

  updateExternalStatus(id,"rejected");

  alert("Project rejected");
  loadPendingReviews();
}


/* INIT */
loadPendingReviews();
