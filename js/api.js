/* ======================================
   ALBUKHR API LAYER
====================================== */

const API_BASE = "http://localhost:3000";

/* ===============================
   STAKE API
=============================== */
async function addStakeAPI(data){

  const res = await fetch(`${API_BASE}/stake`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify(data)
  });

  return await res.json();
}

/* ===============================
   WITHDRAW API
=============================== */
async function withdrawAPI(data){

  const res = await fetch(`${API_BASE}/withdraw`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify(data)
  });

  return await res.json();
}
