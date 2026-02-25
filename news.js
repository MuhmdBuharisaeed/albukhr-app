const newsContainer = document.getElementById("newsContainer");

/* =============================
   VERIFIED PI SOURCES
============================= */

const VERIFIED_SOURCES = [
  "Pi Network Official",
  "Pi Core Team",
  "MinePi.com",
  "Pi News Global",
  "Pi Open Mainnet"
];

/* =============================
   SAMPLE NEWS DATA
============================= */

const NEWS_DATA = [
  {
    id:"pi1",
    title:"Pi Network Ecosystem Expansion",
    content:"Pi Network continues ecosystem development ahead of Open Mainnet phase.",
    source:"Pi Network Official",
    date: Date.now(),
    image:"https://minepi.com/static/media/pi-logo.png",
    link:"https://minepi.com"
  },
  {
    id:"pi2",
    title:"Pi Community Global Meetup",
    content:"Thousands of pioneers gathered for ecosystem update event.",
    source:"Pi News Global",
    date: Date.now(),
    video:"https://www.w3schools.com/html/mov_bbb.mp4"
  }
];

/* =============================
   RENDER FUNCTION
============================= */

function renderNews(){

  newsContainer.innerHTML = "";

  if(!NEWS_DATA.length){
    newsContainer.innerHTML = "<p>No news yet</p>";
    return;
  }

  NEWS_DATA
    .sort((a,b)=> b.date - a.date)
    .forEach(item=>{

      const card = document.createElement("div");
      card.className = "news-card";

      let mediaHTML = "";

      if(item.video){
        mediaHTML = `
          <div class="news-media">
            <video controls>
              <source src="${item.video}" type="video/mp4">
            </video>
          </div>
        `;
      }
      else if(item.image){
        mediaHTML = `
          <div class="news-media">
            <img src="${item.image}" alt="News Image">
          </div>
        `;
      }

      card.innerHTML = `
        ${mediaHTML}
        <div class="news-title">${item.title}</div>
        <div class="news-content">${item.content}</div>
        <div class="news-meta">
          ${item.source} • ${new Date(item.date).toLocaleString()}
        </div>
      `;

      if(item.link){
        card.style.cursor="pointer";
        card.onclick=()=> window.open(item.link,"_blank");
      }

      newsContainer.appendChild(card);
    });
}

renderNews();
