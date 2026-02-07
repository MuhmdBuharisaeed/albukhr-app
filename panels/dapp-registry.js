const DAPP_KEY = "albukhr_dapp_requests";

/* LOAD */
function getDappRequests(){
  return JSON.parse(localStorage.getItem(DAPP_KEY)) || [];
}

/* SAVE */
function saveDappRequests(list){
  localStorage.setItem(DAPP_KEY, JSON.stringify(list));
}

/* SUBMIT */
function addDappRequest(data){
  const list = getDappRequests();
  list.push({
    id: Date.now(),
    status: "pending",
    createdAt: new Date().toISOString(),
    ...data
  });
  saveDappRequests(list);
}

/* UPDATE STATUS */
function updateDappStatus(id,status){
  const list = getDappRequests();
  const req = list.find(x=>x.id===id);
  if(req){
    req.status = status;
    req.reviewedAt = new Date().toISOString();
  }
  saveDappRequests(list);
}
