const ADMIN_ROLE = localStorage.getItem("albukhr_admin_role");

const PANELS = [
 {id:"internal", label:"Internal Admin", roles:["super_admin","internal_admin"]},
 {id:"external", label:"External Admin", roles:["super_admin","external_admin"]},
 {id:"review", label:"External Review", roles:["super_admin","review_admin"]},
 {id:"dapp", label:"DApp Requests", roles:["super_admin","dapp_admin"]},
 {id:"permissions", label:"Permissions", roles:["super_admin"]},
 {id:"transactions", label:"Transactions", roles:["super_admin","finance_admin"]}
];

const nav = document.getElementById("adminNav");

PANELS.forEach(p=>{
 if(p.roles.includes(ADMIN_ROLE)){
   const btn = document.createElement("button");
   btn.textContent = p.label;
   btn.onclick = ()=>openPanel(p.id);
   nav.appendChild(btn);
 }
});

function openPanel(id){
 document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
 document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));

 document.getElementById(id).classList.add("active");
 [...nav.children].find(b=>b.textContent.includes(id.split("_")[0]))?.classList.add("active");

 loadPanel(id);
}

function loadPanel(id){
 fetch(`panels/${id}-admin.html`)
   .then(r=>r.text())
   .then(html=>{
     document.getElementById(id).innerHTML = html;
   });
}
