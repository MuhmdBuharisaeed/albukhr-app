/* ALBUKHR SERVICES PAGE CONTROLLER
   Uses shared environment/Supabase/Pi Auth cores only.
   No localStorage/sessionStorage auth, no new Supabase client.
   ALB Token service remains intentionally closed. */
(function(window,document){
  "use strict";
  function checkDependencies(){
    const env=window.ALBukhrEnvironment,db=window.ALBUKHR_SUPABASE,auth=window.AlbukhrPiAuth;
    if(!env||typeof env.isKnown!=="function")throw new Error("ALBUKHR Environment Core is unavailable.");
    if(!db||typeof db.isNetwork!=="function")throw new Error("ALBUKHR Supabase Core is unavailable.");
    if(!auth||typeof auth.requireAuth!=="function"||typeof auth.isAuthenticated!=="function")throw new Error("ALBUKHR Pi Auth Core is unavailable.");
    if(!env.isKnown())throw new Error("ALBUKHR environment is unavailable.");
    const network=String(env.getNetwork()||"").toLowerCase();
    if(network!=="mainnet"&&network!=="testnet")throw new Error("Invalid ALBUKHR network.");
    if(!db.isNetwork(network))throw new Error("ALBUKHR environment and Supabase network do not match.");
    return {env,auth,network};
  }
  async function protectServicesPage(){
    const deps=checkDependencies(),user=await deps.auth.requireAuth("login.html");
    if(!user)return null;
    if(!deps.auth.isAuthenticated())throw new Error("Pi authentication state is not active.");
    const current=typeof deps.auth.getCurrentUser==="function"?deps.auth.getCurrentUser():user;
    if(!current||!current.id)throw new Error("Authenticated ALBUKHR user identity is unavailable.");
    console.info("ALBUKHR Services access granted.",{user_id:current.id,network:deps.network});
    return current;
  }
  function openInternalProject(){window.alert("Restricted access\n\nInternal Project Creation is reserved for authorized ALBUKHR core personnel. Access is not granted by this page.");}
  function handleNotifications(){
    // Notifications module may expose a same-named global function.
    if(typeof window.openNotifications==="function")window.openNotifications();
    else console.info("ALBUKHR notifications are not available on this page.");
  }
  function initializeDockScrollBehavior(){
    const dock=document.querySelector(".dock-nav");if(!dock)return;let last=window.pageYOffset||0;
    window.addEventListener("scroll",function(){const y=window.pageYOffset||document.documentElement.scrollTop||0;if(Math.abs(y-last)<=10)return;if(y>last&&y>80)dock.classList.add("hide");else dock.classList.remove("hide");last=Math.max(y,0);},{passive:true});
  }
  function initializeActiveDockItem(){
    const page=window.location.pathname.split("/").pop()||"index.html";
    document.querySelectorAll(".dock-item").forEach(function(link){if(link.getAttribute("href")===page){link.classList.add("active");link.setAttribute("aria-current","page");}else{link.classList.remove("active");link.removeAttribute("aria-current");}});
  }
  function initializeActions(){
    const internal=document.getElementById("internalProjectCard");if(internal)internal.addEventListener("click",openInternalProject);
    const notifications=document.getElementById("notificationsButton");if(notifications)notifications.addEventListener("click",handleNotifications);
    // No event handler is attached to #albTokenService: it is a closed placeholder.
  }
  async function initialize(){
    try{const user=await protectServicesPage();if(!user)return;initializeDockScrollBehavior();initializeActiveDockItem();initializeActions();document.documentElement.setAttribute("data-albukhr-auth","authenticated");console.info("ALBUKHR Services Controller ready.");}
    catch(error){console.error("Services initialization failed:",error);document.documentElement.removeAttribute("data-albukhr-auth");if(window.location.pathname.split("/").pop()!=="login.html")window.location.replace("login.html");}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})(window,document);
