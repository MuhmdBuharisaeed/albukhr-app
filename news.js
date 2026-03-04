/* =========================================
   ALBUKHR NEWS ENGINE
========================================= */

const newsData = [

{
title:"Mainnet Migration Update",
verified:true,
source:"Pi Network Blog",
date:"10/02/2026",
description:"Pi Core Team shared latest migration statistics and roadmap for ecosystem expansion.",
image:"",
},

{
title:"New KYC Phase Announcement",
verified:true,
source:"Pi App Announcement",
date:"25/01/2026",
description:"Additional KYC slots opened for verified pioneers in preparation for broader Mainnet rollout.",
image:"",
}

];


/* =========================================
   RENDER NEWS
========================================= */

function renderNews(){

const container = document.getElementById("newsContainer");

if(!container) return;

container.innerHTML="";

newsData.forEach(news=>{

const card = document.createElement("div");
card.className="news-card";

card.innerHTML = `

${news.image ? `<img src="${news.image}" class="news-image">` : ""}

<div class="news-title">
${news.title}
${news.verified ? `<span class="verified-badge">Verified</span>` : ""}
</div>

<div class="news-desc">
${news.description}
</div>

<div class="news-footer">

<span class="news-source">
${news.source}
</span>

<span class="news-date">
${news.date}
</span>

</div>

`;

container.appendChild(card);

});

}

document.addEventListener("DOMContentLoaded",renderNews);
