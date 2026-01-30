/* ===============================
   ALBUKHR – EXTERNAL INVITE ENGINE
================================ */

function getInvites(){
  return JSON.parse(
    localStorage.getItem("external_invites") || "[]"
  );
}

function saveInvites(list){
  localStorage.setItem(
    "external_invites",
    JSON.stringify(list)
  );
}

/* VALIDATE INVITE */
function validateInvite(input){
  const code = input.trim();

  const invites = getInvites();

  const invite = invites.find(i =>
    i.code === code && i.status === "active"
  );

  if(!invite) return { ok:false, reason:"Invalid invite" };

  if(invite.used >= invite.maxUse)
    return { ok:false, reason:"Invite already used" };

  return { ok:true, invite };
}

/* MARK INVITE AS USED */
function consumeInvite(code){
  const invites = getInvites();

  invites.forEach(i=>{
    if(i.code === code){
      i.used += 1;
      if(i.used >= i.maxUse){
        i.status = "used";
      }
    }
  });

  saveInvites(invites);
}

/* BOOTSTRAP (TEMP – DEMO INVITES) */
(function seedInvites(){
  if(localStorage.getItem("external_invites")) return;

  saveInvites([
    {
      code:"ALB-EXT-1001",
      issuedBy:"Albukhr",
      status:"active",
      maxUse:1,
      used:0,
      createdAt:new Date().toISOString()
    }
  ]);
})();
