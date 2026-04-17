/* ======================================
   ALBUKHR API LAYER v2 (FINTECH READY)
====================================== */

const API_BASE = "https://api.albukhr.com"; // 🔥 CHANGE THIS

/* ======================================
   CORE FETCH WRAPPER (SECURE)
====================================== */
async function apiRequest(endpoint, data){

  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 10000); // 10s timeout

  try{

    const res = await fetch(`${API_BASE}${endpoint}`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",

        /* 🔐 BASIC AUTH (future upgrade) */
        "x-app":"albukhr-v1"
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if(!res.ok){
      return {
        success:false,
        error:"Server error"
      };
    }

    const json = await res.json();

    return json;

  }catch(err){

    console.error("API ERROR:", err);

    if(err.name === "AbortError"){
      return {success:false,error:"Request timeout"};
    }

    return {
      success:false,
      error:"Network error"
    };

  }

}

/* ===============================
   STAKE API
=============================== */
async function addStakeAPI(data){
  return await apiRequest("/stake", data);
}

/* ===============================
   WITHDRAW API
=============================== */
async function withdrawAPI(data){
  return await apiRequest("/withdraw", data);
       }
