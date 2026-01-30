/* ===============================
   ALBUKHR – ADMIN REVIEW ENGINE
================================ */

const box = document.getElementById("list");

function getPending(){
  return JSON.parse(
    localStorage.getItem("external_projects_pending") || "[]"
  );
}

function save(key,data){
  localStorage.setItem(key, JSON.stringify(data));
}

function render(){
  const pending = getPending();
  box.innerHTML = "";

  if(pending.length === 0){
    box.innerHTML =
      "<p style='color:#777;font-size:13px'>No pending projects</p>";
    return;
  }

  pending.forEach((p,i)=>{
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div class="title">${p.name}</div>
      <div class="meta">
        Owner: ${p.owner}<br>
        PI: ${p.piUsername}<br>
        Target: ${p.target} Pi<br>
        Duration: ${p.duration} days
      </div>

      <div class="btns">
        <button class="btn approve" onclick="approve(${i})">
          Approve
        </button>
        <button class="btn reject" onclick="reject(${i})">
          Reject
        </button>
      </div>
    `;

    box.appendChild(div);
  });
}

function approve(index){
  const pending = getPending();
  const approved =
    JSON.parse(localStorage.getItem("external_projects_active") || "[]");

  const project = pending.splice(index,1)[0];

  project.status = "approved";
  project.approvedAt = new Date().toISOString();
  project.totalStaked = 0;

  approved.push(project);

  save("external_projects_pending", pending);
  save("external_projects_active", approved);

  render();
}

function reject(index){
  const pending = getPending();
  const rejected =
    JSON.parse(localStorage.getItem("external_projects_rejected") || "[]");

  const project = pending.splice(index,1)[0];

  project.status = "rejected";
  project.rejectedAt = new Date().toISOString();

  rejected.push(project);

  save("external_projects_pending", pending);
  save("external_projects_rejected", rejected);

  render();
}

render();
