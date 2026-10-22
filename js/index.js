(function(){
"use strict";

/* =======================================================
   DOCK NAVIGATION
======================================================= */

let lastScroll=0;
const threshold=10;
const dock=document.querySelector(".dock-nav");

function onScroll(){

  if(!dock) return;

  const current=window.pageYOffset;

  if(Math.abs(current-lastScroll)<=threshold) return;

  dock.classList.toggle("hide",current>lastScroll);

  lastScroll=current;
}

window.addEventListener(
  "scroll",
  onScroll,
  {passive:true}
);

const currentPage=
  location.pathname.split("/").pop() ||
  "index.html";

document
  .querySelectorAll(".dock-item")
  .forEach(link=>{

    if(
      link.getAttribute("href")===
      currentPage
    ){

      link.classList.add("active");

    }

  });

/* =======================================================
   DRAWER
======================================================= */

function openDrawer(){

  document
    .getElementById("sideDrawer")
    ?.classList.add("open");

  document
    .getElementById("drawerOverlay")
    ?.classList.add("show");
}

function closeDrawer(){

  document
    .getElementById("sideDrawer")
    ?.classList.remove("open");

  document
    .getElementById("drawerOverlay")
    ?.classList.remove("show");
}

window.openDrawer=openDrawer;
window.closeDrawer=closeDrawer;

document.addEventListener(
  "DOMContentLoaded",
  ()=>{

    document
      .querySelector(".menu-icon")
      ?.addEventListener(
        "click",
        openDrawer
      );

  }
);

/* -------------------------------------------------------
   ASSET VISIBILITY
   Session memory only: no LocalStorage persistence.
------------------------------------------------------- */

let assetsHidden=false;

function applyVisibility(){

  document
    .getElementById("homeStake")
    ?.classList.toggle(
      "hidden-amount",
      assetsHidden
    );

  document
    .getElementById("homeReward")
    ?.classList.toggle(
      "hidden-amount",
      assetsHidden
    );

  document
    .querySelectorAll(".asset-stake")
    .forEach(el=>
      el.classList.toggle(
        "hidden-amount",
        assetsHidden
      )
    );
}

window.toggleAssetsVisibility=function(){

  assetsHidden=!assetsHidden;

  applyVisibility();
};

window.applyVisibility=applyVisibility;


/* -------------------------------------------------------
   POPULAR PROJECTS — LOADING / EMPTY STATE
------------------------------------------------------- */

function showPopularProjectsMessage(message) {
  const container = document.getElementById("popularProjects");
  if (!container) return;

  container.replaceChildren();
  container.setAttribute("aria-busy", "false");

  const notice = document.createElement("div");
  notice.className = "project-loading-error";
  notice.setAttribute("role", "status");
  notice.textContent = message;

  container.appendChild(notice);
}

/* -------------------------------------------------------
   HOME DATA
------------------------------------------------------- */

async function loadHome(){

  try{

    
if (typeof getAllStakesMerged !== "function") {
  console.warn("getAllStakesMerged missing");

  // Projects can still render from the existing catalog.
  renderPopular({});

  return;
}

    let stakes=
      await getAllStakesMerged();

    const globalStakes=
  typeof getGlobalStakes==="function"
    ? await getGlobalStakes()
    : [];

    if(!Array.isArray(stakes))
      stakes=[];

    const userMap={};
    const globalMap={};
    const popularMap={};
    const countMap={};

    let totalStake=0;
    let totalReward=0;

    stakes.forEach(s=>{

      if(!s||!s.project)
        return;

      const type=
        s.type||"stake";

      const amount=
        Number(s.amount)||0;

      if(type==="stake"){

        totalStake+=amount;

        userMap[s.project]=
          (userMap[s.project]||0)+amount;

        if(!globalMap[s.project])
          globalMap[s.project]={
            total:0,
            investors:0
          };

        globalMap[s.project].total+=amount;

        const reward=
          Number(s.reward)||0;

        const withdrawn=
          Number(s.withdrawnReward)||0;

        totalReward+=
          Math.max(
            0,
            reward-withdrawn
          );
      }

      if(type==="capital"){

        totalStake-=
          Math.abs(amount);

        userMap[s.project]=
          (userMap[s.project]||0)-
          Math.abs(amount);

        if(globalMap[s.project])
          globalMap[s.project].total-=
            Math.abs(amount);
      }

      countMap[s.project]=
        (countMap[s.project]||0)+1;

    });

    if(Array.isArray(globalStakes)){

      globalStakes.forEach(s=>{

        if(
          !s||
          s.type!=="stake"||
          !s.project
        )
          return;

        if(!popularMap[s.project])
          popularMap[s.project]={
            total:0,
            investors:0
          };

        popularMap[s.project].total+=
          Number(s.amount)||0;

      });

    }

    Object.keys(globalMap).forEach(
      project=>{

        globalMap[project].investors=
          countMap[project]||0;

      }
    );

    document
      .getElementById("homeStake")
      ?.replaceChildren(
        document.createTextNode(
          Math.max(
            0,
            totalStake
          ).toFixed(2)+" Pi"
        )
      );

    document
      .getElementById("homeReward")
      ?.replaceChildren(
        document.createTextNode(
          totalReward.toFixed(2)+" Pi"
        )
      );

    if(typeof renderPopular==="function")
      renderPopular(popularMap);

    if(typeof renderAssets==="function")
      renderAssets(
        userMap,
        globalMap
      );

    applyVisibility();


} catch (err) {
  console.error("loadHome error:", err);

  // Clear the loading skeleton and show the existing project catalog.
  // Do not leave the user staring at an endless loading state.
  renderPopular({});
}

}

/* =======================================================
   POPULAR PROJECTS
   Minimal fix:
   PROJECT_CONFIG is the project catalog.
   globalMap only supplies live statistics.
   Therefore a registered project such as Raheem
   must still appear even when it has zero staking data.
======================================================= */


function renderPopular(globalMap) {
  const container = document.getElementById("popularProjects");
  if (!container) return;

  if (typeof PROJECT_CONFIG === "undefined") {
    showPopularProjectsMessage(
      "Unable to load projects. Please refresh and try again."
    );
    return;
  }

  container.replaceChildren();
  container.setAttribute("aria-busy", "false");

  /*
    PROJECT_CONFIG = registered frontend projects.
    globalMap = optional live staking statistics.

    A project must not disappear simply because
    it currently has no staking data.
  */
  const entries=Object.keys(PROJECT_CONFIG).map(project=>[
    project,
    (globalMap&&globalMap[project])||{
      total:0,
      investors:0
    }
  ]);

  entries
    .sort((a,b)=>
      (Number(b[1]?.total)||0)-
      (Number(a[1]?.total)||0)
    )
    .slice(0,10)
    .forEach(([project,data],index)=>{

      const config=PROJECT_CONFIG[project];

      if(!config) return;

      const div=document.createElement("div");

      div.className="popular-card";

      div.setAttribute(
        "data-rank",
        "#"+(index+1)
      );

      div.onclick=function(){
  const projectKey =
    PROJECT_CONFIG[project]?.slug ||
    PROJECT_CONFIG[project]?.project_code ||
    project;

  window.location.href =
    "project.html?project="+
    encodeURIComponent(projectKey);
};
      div.innerHTML=
        '<div class="popular-icon">'+
        (config.icon||"")+
        '</div>'+
        '<div class="popular-name">'+
        config.title+
        '</div>'+
        '<div class="popular-amount">'+
        Number(data.total||0).toFixed(2)+
        ' Pi</div>';

      container.appendChild(div);
    });

   
if (container.children.length === 0) {
  showPopularProjectsMessage(
    "No projects are available right now."
  );
}

 }

/* =======================================================
   ASSETS
   Existing behavior preserved.
======================================================= */

function renderAssets(userMap,globalMap){

  if(typeof PROJECT_CONFIG==="undefined")
    return;

  const container=
    document.getElementById(
      "assetsContainer"
    );

  if(!container)
    return;

  container.innerHTML="";

  const merged=
    Object.keys(PROJECT_CONFIG)
      .map(project=>({

        name:project,

        config:
          PROJECT_CONFIG[project],

        globalTotal:
          Number(
            globalMap[project]?.total
          )||0,

        userAmount:
          Math.max(
            0,
            Number(
              userMap[project]
            )||0
          )

      }));

  merged.sort((a,b)=>{

    if(
      a.userAmount>0&&
      b.userAmount===0
    )
      return -1;

    if(
      a.userAmount===0&&
      b.userAmount>0
    )
      return 1;

    if(
      a.userAmount!==
      b.userAmount
    )
      return (
        b.userAmount-
        a.userAmount
      );

    return (
      b.globalTotal-
      a.globalTotal
    );

  });

  merged.forEach(item=>{

    if(!item.config)
      return;

    const div=
      document.createElement("div");

    div.className=
      "asset-item";

    div.onclick=function(){
  const projectKey =
    item.config?.slug ||
    item.config?.project_code ||
    item.name;

  window.location.href =
    "project.html?project="+
    encodeURIComponent(projectKey);
};

    div.innerHTML=
      '<div class="asset-icon">'+
      (item.config.icon||"")+
      '</div>'+
      '<div class="asset-left">'+
      '<div class="asset-header">'+
      '<div class="asset-info">'+
      '<div class="asset-name">'+
      item.config.title+
      '</div>'+
      '<div class="asset-stake">'+
      (
        item.userAmount>0
        ?item.userAmount.toFixed(2)+
          " Pi Staked"
        :"Not Staked"
      )+
      '</div>'+
      '</div>'+
      '<div class="asset-mini-chart">'+
      '<svg viewBox="0 0 120 36" preserveAspectRatio="none">'+
      '<polyline fill="none" stroke="'+
      (
        item.userAmount>0
        ?" #19b36b"
        :"#b8b8b8"
      ).trim()+
      '" stroke-width="2.2" points="0,28 15,26 30,24 45,22 60,18 75,20 90,14 105,12 120,8"/>'+
      '</svg>'+
      '</div>'+
      '</div>'+
      '<div class="asset-status">'+
      (
        item.userAmount>0
        ?"🟢 Active"
        :"⚪ Inactive"
      )+
      '</div>'+
      '</div>';

    container.appendChild(div);

  });
}

/* -------------------------------------------------------
   AUTH — shared Pi Auth Core only.
   No LocalStorage auth state.
------------------------------------------------------- */

async function initializeAuthenticatedHome(){

  if(!window.AlbukhrPiAuth){

    window.location.replace(
      "login.html"
    );

    return;
  }

  const user=
    await window.AlbukhrPiAuth
      .requireAuth(
        "login.html"
      );

  if(!user)
    return;

  const el=
    document.getElementById(
      "piUser"
    );

  if(el)
    el.textContent=
      user.username;

  await loadHome();

  console.info(
    "🚀 HOME LOAD",
    {
      uid:user.uid,

      username:user.username,

      environment:
        window.ALBUKHR_SUPABASE
          ?.environment,

      network:
        window.ALBUKHR_SUPABASE
          ?.network
    }
  );
}

window.openAlbukhrAI=function(){

  const note=
    document.getElementById(
      "aiDevNote"
    );

  if(!note)
    return;

  note.classList.add(
    "show"
  );

  window.setTimeout(
    ()=>
      note.classList.remove(
        "show"
      ),
    2500
  );
};

/* -------------------------------------------------------
   AI button position — memory only;
   no LocalStorage.
------------------------------------------------------- */

const ai=
  document.getElementById(
    "albukhrAI"
  );

let isDragging=false;
let offsetX=0;
let offsetY=0;

function startDrag(e){

  if(!ai)
    return;

  isDragging=true;

  const point=
    e.touches
      ?e.touches[0]
      :e;

  const rect=
    ai.getBoundingClientRect();

  offsetX=
    point.clientX-
    rect.left;

  offsetY=
    point.clientY-
    rect.top;
}

function drag(e){

  if(
    !isDragging||
    !ai
  )
    return;

  const point=
    e.touches
      ?e.touches[0]
      :e;

  ai.style.left=
    (
      point.clientX-
      offsetX
    )+"px";

  ai.style.top=
    (
      point.clientY-
      offsetY
    )+"px";

  ai.style.right=
    "auto";

  ai.style.bottom=
    "auto";
}

function stopDrag(){

  if(
    !isDragging||
    !ai
  )
    return;

  isDragging=false;

  const rect=
    ai.getBoundingClientRect();

  ai.style.left=
    (
      rect.left<
      window.innerWidth/2
      ?10
      :window.innerWidth-
       rect.width-
       10
    )+"px";

  window.setTimeout(
    ()=>
      ai.classList.add(
        "minimized"
      ),
    2000
  );
}

if(ai){

  ai.addEventListener(
    "touchstart",
    startDrag,
    {passive:true}
  );

  ai.addEventListener(
    "mousedown",
    startDrag
  );

  document.addEventListener(
    "touchmove",
    drag,
    {passive:true}
  );

  document.addEventListener(
    "mousemove",
    drag
  );

  document.addEventListener(
    "touchend",
    stopDrag
  );

  document.addEventListener(
    "mouseup",
    stopDrag
  );

  ai.addEventListener(
    "click",
    ()=>
      ai.classList.remove(
        "minimized"
      )
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializeAuthenticatedHome
);

})();
