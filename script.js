// Samun element ɗin welcome text da logo
const header = document.querySelector('.header');
const brand = document.querySelector('.brand');
const tagline = document.querySelector('.tagline');

// Saita initial position
let position = header.offsetWidth; // fara daga dama sosai
const speed = 2; // pixels per frame

function moveHeader() {
  // rage position
  position -= speed;

  // idan ya wuce hagu, dawo daga dama
  if (position < -header.offsetWidth) {
    position = window.innerWidth;
  }

  // apply style
  brand.style.transform = `translateX(${position}px)`;
  tagline.style.transform = `translateX(${position}px)`;

  requestAnimationFrame(moveHeader);
}

// Fara animation
moveHeader();

function openRaheem() {
  document.getElementById("projectsList").style.display = "none";
  document.getElementById("raheemDetails").style.display = "block";
}

function closeRaheem() {
  document.getElementById("raheemDetails").style.display = "none";
  document.getElementById("projectsList").style.display = "block";
}
