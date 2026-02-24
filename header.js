/* =====================================
   ALBUKHR – GLOBAL HEADER INJECTOR
===================================== */

function renderAlbukhrHeader(options = {}){

  const showHamburger = options.hamburger === true;

  const headerHTML = `
    <header class="header">
      <div class="header-left">
        <img src="file_000000007bb062439b275f4bcf52e264.png" class="main-logo">
        <span class="brand">ALBUKHR</span>
      </div>

      ${
        showHamburger
        ? `
        <div class="menu-icon" onclick="goToSettings()">
          <div></div>
          <div></div>
          <div></div>
        </div>
        `
        : ``
      }
    </header>
  `;

  document.body.insertAdjacentHTML("afterbegin", headerHTML);
}

/* Optional helper */
function goToSettings(){
  window.location.href = "settings.html";
}
