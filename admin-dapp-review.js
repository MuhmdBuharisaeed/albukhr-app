/* ===============================
   ALBUKHR – ADMIN DAPP REVIEW
================================ */

const body = document.getElementById("reviewBody");

/* -------------------------------
   LOAD REQUESTS
-------------------------------- */
function loadDappReviews(){

  if(typeof getAllRequests !== "function"){
    body.innerHTML =
      `<tr><td colspan="7" class="empty">Engine not loaded</td></tr>`;
    return;
  }

  const list = getAllRequests();
  body.innerHTML = "";

  if(list.length === 0){
    body.innerHTML =
      `<tr><td colspan="7" class="empty">No requests found</td></tr>`;
    return;
  }

  list.forEach(r=>{
    const d = new Date(r.createdAt);
    const date =
      d.toLocaleDateString() + " " +
      d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

    body.innerHTML += `
      <tr>
        <td>${date}</td>
        <td>
          <span class="badge ${r.serviceType === "developer" ? "dev":"studio"}">
            ${r.serviceType === "developer" ? "Developer" : "Pi Studio"}
          </span>
        </td>
        <td>
          <strong>${r.projectName}</strong><br>
          <small>${r.id}</small>
        </td>
        <td>${r.piUser}</td>
        <td>${r.receipt || "—"}</td>
        <td>
          <span class="badge ${r.status}">
            ${r.status}
          </span>
        </td>
        <td>
          ${
            r.status === "pending"
            ? `
              <button class="btn approve"
                onclick="approve('${r.id}')">Approve</button>
              <button class="btn reject"
                onclick="reject('${r.id}')">Reject</button>
            `
            : "—"
          }
        </td>
      </tr>
    `;
  });
}

/* -------------------------------
   ACTIONS
-------------------------------- */
function approve(id){
  updateStatus(id,"approved");
}

function reject(id){
  updateStatus(id,"rejected");
}

function updateStatus(id,status){
  const admin = getAdmin();
  if(!admin || !["super_admin","review_admin"].includes(admin.role)){
    alert("Permission denied");
    return;
  }

  const list = getAllRequests();
  const updated = list.map(r=>{
    if(r.id === id){
      r.status = status;
      r.reviewedAt = Date.now();
      r.reviewedBy = admin.role;
    }
    return r;
  });

  localStorage.setItem(
    "albukhr_pi_dapp_requests",
    JSON.stringify(updated)
  );

  loadDappReviews();
}

/* -------------------------------
   INIT
-------------------------------- */
window.addEventListener("DOMContentLoaded", loadDappReviews);
