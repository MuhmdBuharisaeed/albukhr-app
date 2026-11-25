/* ALBUKHR — PROJECT LOGO RENDERER v4.1
   Universal project logo rendering for Popular Projects and Assets.
   Registry logo_url remains authoritative.
   Home catalog bootstrap is intentionally independent of Pi authentication.
   - Popular cards display the first word only while preserving full identity.
   - Mainnet Asset cards display the first project word only.
   - Mainnet Asset status is compacted without reducing the project-name area.
   - All Popular Project logos use one shared frame and image size.
   - Asset stake bootstrap does not display a stake placeholder.
   No database/SQL changes. No Dock Navigation changes.
*/
(function(window, document){
  "use strict";

  function clean(v){ return String(v == null ? "" : v).trim(); }

  function currentNetwork(){
    const projectApi = window.ALBukhrProjectConfig;
    const network = projectApi && typeof projectApi.getCurrentNetwork === "function"
      ? projectApi.getCurrentNetwork()
      : window.ALBUKHR_SUPABASE && window.ALBUKHR_SUPABASE.network;
    return clean(network).toLowerCase();
  }

  function escapeHtml(v){
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;").replace(/"/g,"&quot;")
      .replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/'/g,"&#39;");
  }

  function findConfig(value){
    if(window.ALBukhrProjectConfig &&
       typeof window.ALBukhrProjectConfig.find === "function"){
      const found = window.ALBukhrProjectConfig.find(value);
      if(found) return found;
    }

    const catalog = window.PROJECT_CONFIG;
    if(!catalog || typeof catalog !== "object") return null;

    const wanted = clean(value).toLowerCase();
    if(!wanted) return null;

    for(const key of Object.keys(catalog)){
      const cfg = catalog[key] || {};
      const candidates = [
        key, cfg.project_code, cfg.slug, cfg.project_id,
        cfg.id, cfg.title, cfg.name
      ];
      if(candidates.some(v => clean(v).toLowerCase() === wanted)){
        return cfg;
      }
    }
    return null;
  }

  function stableKey(value){
    const cfg = findConfig(value);
    if(!cfg) return clean(value);
    return clean(cfg.project_code) ||
           clean(cfg.slug) ||
           clean(cfg.project_id) ||
           clean(value);
  }

  function projectUrl(value){
    const key = stableKey(value);
    return key ? "project.html?project=" + encodeURIComponent(key) : null;
  }

  function firstProjectWord(value){
    const fullName = clean(value);
    if(!fullName) return "";
    return fullName.split(/\s+/)[0];
  }

  function applyPopularIconFrame(container){
    if(!container) return;

    /*
     * One shared 54×54 frame for every Popular Project logo.
     * This prevents external/core logos from rendering with
     * different frame dimensions or alignment.
     */
    Object.assign(container.style,{
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      width:"54px",
      height:"54px",
      minWidth:"54px",
      minHeight:"54px",
      maxWidth:"54px",
      maxHeight:"54px",
      flex:"0 0 54px",
      margin:"0 auto 10px",
      padding:"0",
      overflow:"hidden",
      boxSizing:"border-box",
      border:"1px solid #e1eee5",
      borderRadius:"15px",
      background:"#fff",
      textAlign:"center"
    });
  }

  function applyLogoSizing(img, size){
    if(!img) return;
    const px = Number(size) === 48 ? 48 : 44;
    img.style.width = px + "px";
    img.style.height = px + "px";
    img.style.maxWidth = px + "px";
    img.style.maxHeight = px + "px";
    img.style.minWidth = px + "px";
    img.style.minHeight = px + "px";
    img.style.objectFit = "contain";
    img.style.objectPosition = "center";
    img.style.display = "block";
    img.style.margin = "0 auto";
    img.style.flex = "0 0 " + px + "px";
    img.style.boxSizing = "border-box";
  }

  function renderLogo(container, config, altText, options){
    if(!container) return;

    const logoUrl = clean(config && config.logo_url);

    if(!logoUrl){
      const old = container.querySelector("img.project-logo");
      if(old) old.remove();
      return;
    }

    const existing = container.querySelector("img.project-logo");
    if(existing && existing.getAttribute("src") === logoUrl){
      applyLogoSizing(existing, options && options.size);
      return;
    }

    const img = document.createElement("img");
    img.className = "project-logo";
    img.src = logoUrl;
    img.alt = altText || config.title || config.name || "ALBUKHR Project";
    img.width = Number(options && options.size) === 48 ? 48 : 44;
    img.height = img.width;
    img.decoding = "async";
    img.loading = options && options.eager ? "eager" : "lazy";
    if(options && options.eager) {
      img.setAttribute("fetchpriority", "high");
    } else {
      img.setAttribute("fetchpriority", "low");
    }
    img.referrerPolicy = "no-referrer";

    container.replaceChildren(img);
    applyLogoSizing(img, options && options.size);

    container.setAttribute("data-logo-source","registry");
    container.setAttribute("data-logo-size",img.width + "x" + img.height);
  }

  function processCard(card, iconSelector, titleSelector){
    if(!card) return;

    const icon = card.querySelector(iconSelector);
    const titleNode = card.querySelector(titleSelector);
    if(!icon || !titleNode) return;

    const isPopular = card.classList.contains("popular-card");
    const isAsset = card.classList.contains("asset-item");
    const isMainnetAsset = isAsset && currentNetwork() === "mainnet";
    const visibleTitle = clean(titleNode.textContent);
    const storedFullName = (isPopular || (isAsset && card.hasAttribute("data-mainnet-compact")))
      ? clean(card.getAttribute("data-project-full-name"))
      : "";
    const lookupName = storedFullName || visibleTitle;
    if(!lookupName) return;

    /* Resolve config against the full name before changing visible text. */
    const config = findConfig(lookupName) || findConfig(visibleTitle);
    if(!config) return;

    const fullName = clean(config.title || config.name || lookupName);
    const rank = Number(String(card.getAttribute("data-rank") || "").replace("#",""));
    const eager = isPopular && Number.isFinite(rank) && rank > 0 && rank <= 3;
    const size = isPopular ? 48 : 44;

    if(isPopular){
      card.setAttribute("data-project-full-name",fullName);
      card.setAttribute("aria-label",fullName);
      titleNode.setAttribute("title",fullName);
      titleNode.setAttribute("aria-label",fullName);

      const shortName = firstProjectWord(fullName);
      if(visibleTitle !== shortName){
        titleNode.textContent = shortName;
      }

      applyPopularIconFrame(icon);
    }

    if(isAsset && isMainnetAsset){
      /*
       * Mainnet-only compact title. Keep the authoritative full project
       * identity on the card so logo resolution, accessibility and click
       * navigation never depend on the shortened visible label.
       */
      const shortName = firstProjectWord(fullName).toUpperCase();
      card.setAttribute("data-project-full-name",fullName);
      card.setAttribute("data-mainnet-compact","true");
      card.setAttribute("aria-label",fullName);
      titleNode.setAttribute("title",fullName);
      titleNode.setAttribute("aria-label",fullName);
      if(visibleTitle !== shortName){
        titleNode.textContent = shortName;
      }
    } else if(isAsset && card.hasAttribute("data-mainnet-compact")){
      /* Restore the original Testnet/full-name presentation after a switch. */
      titleNode.textContent = fullName;
      card.removeAttribute("data-mainnet-compact");
      card.removeAttribute("data-project-full-name");
      card.removeAttribute("aria-label");
      titleNode.removeAttribute("title");
      titleNode.removeAttribute("aria-label");
    }

    renderLogo(icon, config, fullName, {eager, size});

    /* Keep stable identifiers intact for card navigation. */
    const key = stableKey(fullName);
    const url = projectUrl(fullName);

    if(key) card.setAttribute("data-project-key",key);
    if(clean(config.project_code))
      card.setAttribute("data-project-code",clean(config.project_code));
    if(clean(config.slug))
      card.setAttribute("data-project-slug",clean(config.slug));
    if(clean(config.project_id))
      card.setAttribute("data-project-id",clean(config.project_id));
    if(url) card.setAttribute("data-project-url",url);
  }

  function processAll(){
    document.querySelectorAll(".popular-card").forEach(card =>
      processCard(card,".popular-icon",".popular-name")
    );
    document.querySelectorAll(".asset-item").forEach(card =>
      processCard(card,".asset-icon",".asset-name")
    );
  }

  /* -------------------------------------------------------
     HOME CATALOG BOOTSTRAP
     Render the approved catalog before Pi authentication.
     Authenticated index.js rendering remains authoritative
     and replaces these temporary cards when user data arrives.
  ------------------------------------------------------- */

  function getHomeProjects(){
    const projectApi = window.ALBukhrProjectConfig;
    let projects = [];

    if(projectApi &&
       typeof projectApi.getProjectsForCurrentNetwork === "function"){
      projects = projectApi.getProjectsForCurrentNetwork();
    } else if(window.PROJECT_CONFIG && typeof window.PROJECT_CONFIG === "object"){
      projects = Object.values(window.PROJECT_CONFIG);
    }

    const network = clean(
      projectApi && typeof projectApi.getCurrentNetwork === "function"
        ? projectApi.getCurrentNetwork()
        : window.ALBUKHR_SUPABASE && window.ALBUKHR_SUPABASE.network
    ).toLowerCase();

    return (Array.isArray(projects) ? projects : [])
      .filter(cfg => {
        if(!cfg || !clean(cfg.title)) return false;
        const projectNetwork = clean(cfg.network).toLowerCase();
        return !projectNetwork || !network || projectNetwork === network;
      })
      .sort((a,b) => {
        const aSlot = a.core_slot == null ? Number.MAX_SAFE_INTEGER : Number(a.core_slot);
        const bSlot = b.core_slot == null ? Number.MAX_SAFE_INTEGER : Number(b.core_slot);
        if(aSlot !== bSlot) return aSlot - bSlot;
        return clean(a.title).localeCompare(clean(b.title));
      });
  }

  function createElement(tag, className, text){
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(text != null) node.textContent = String(text);
    return node;
  }

  function createPopularCard(config, rank){
    const card = createElement("div","popular-card");
    card.setAttribute("data-catalog-bootstrap","true");
    card.setAttribute("data-rank","#" + rank);
    card.setAttribute("data-project-full-name",clean(config.title));

    const icon = createElement("div","popular-icon");
    const name = createElement("div","popular-name",firstProjectWord(config.title));
    name.setAttribute("title",clean(config.title));
    name.setAttribute("aria-label",clean(config.title));
    const amount = createElement("div","popular-amount","Loading popularity data…");

    card.setAttribute("aria-label",clean(config.title));
    card.append(icon,name,amount);
    return card;
  }

  function createAssetCard(config){
    const card = createElement("div","asset-item");
    card.setAttribute("data-catalog-bootstrap","true");

    const icon = createElement("div","asset-icon");
    const left = createElement("div","asset-left");
    const header = createElement("div","asset-header");
    const info = createElement("div","asset-info");
    const name = createElement("div","asset-name",config.title);
    /* Keep the target for real data, but do not show a stake placeholder. */
    const stake = createElement("div","asset-stake","");
    stake.hidden = true;
    const chart = createElement("div","asset-mini-chart");
    const status = createElement("div","asset-status","Checking account data…");

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS,"svg");
    svg.setAttribute("viewBox","0 0 120 36");
    svg.setAttribute("preserveAspectRatio","none");

    const line = document.createElementNS(svgNS,"polyline");
    line.setAttribute("fill","none");
    line.setAttribute("stroke","#b8b8b8");
    line.setAttribute("stroke-width","2.2");
    line.setAttribute("points","0,28 15,26 30,24 45,22 60,18 75,20 90,14 105,12 120,8");

    svg.appendChild(line);
    chart.appendChild(svg);
    info.append(name,stake);
    header.append(info,chart);
    left.append(header);
    card.append(icon,left,status);
    return card;
  }

  function canReplaceWithBootstrap(container){
    if(!container) return false;
    if(container.children.length === 0) return true;
    return Array.from(container.children).every(node =>
      node.classList.contains("project-loading-skeleton") ||
      node.hasAttribute("data-catalog-bootstrap")
    );
  }

  function renderHomeCatalog(){
    if(!document.body || document.body.getAttribute("data-page") !== "home"){
      return false;
    }

    const popular = document.getElementById("popularProjects");
    const assets = document.getElementById("assetsContainer");
    if(!popular || !assets) return false;

    const projects = getHomeProjects();
    if(!projects.length) return false;

    if(canReplaceWithBootstrap(popular)){
      const popularFragment = document.createDocumentFragment();
      projects.slice(0,10).forEach((config,index) => {
        popularFragment.appendChild(createPopularCard(config,index + 1));
      });
      popular.replaceChildren(popularFragment);
      popular.setAttribute("aria-busy","false");
    }

    if(canReplaceWithBootstrap(assets)){
      const assetsFragment = document.createDocumentFragment();
      projects.forEach(config => {
        assetsFragment.appendChild(createAssetCard(config));
      });
      assets.replaceChildren(assetsFragment);
    }

    processAll();
    return true;
  }

  function handleRegistryReady(event){
    const network = currentNetwork();
    const eventNetwork = clean(event && event.detail && event.detail.network).toLowerCase();
    if(network && eventNetwork && network !== eventNetwork) return;

    renderHomeCatalog();
    processAll();
  }

  function handleCardClick(event){
    const target = event.target;
    if(!target || typeof target.closest !== "function") return;

    const card = target.closest(".popular-card, .asset-item");
    if(!card) return;
    if(target.closest("a, button, input, textarea, select")) return;

    const key =
      card.getAttribute("data-project-key") ||
      card.getAttribute("data-project-code") ||
      card.getAttribute("data-project-slug") ||
      card.getAttribute("data-project-id") ||
      card.getAttribute("data-project-full-name") ||
      clean(card.querySelector(".popular-name, .asset-name")?.textContent);

    const url = projectUrl(key);
    if(!url) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(url);
  }

  function init(){
    processAll();
    renderHomeCatalog();

    const popular = document.getElementById("popularProjects");
    const assets = document.getElementById("assetsContainer");

    if(typeof MutationObserver === "function"){
      const observer = new MutationObserver(() => {
        processAll();
      });
      [popular, assets].forEach(target => {
        if(target) observer.observe(target,{childList:true,subtree:true});
      });
    }

    window.addEventListener("click",handleCardClick,true);
    window.addEventListener("albukhr:project-registry-ready",handleRegistryReady);
    window.addEventListener("albukhr:project-logo-refresh",processAll);

    window.setTimeout(processAll,0);
    window.setTimeout(processAll,250);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else{
    init();
  }

  window.ALBukhrProjectLogoRenderer =
    Object.freeze({
      refresh:processAll,
      renderHomeCatalog
    });

  window.AlbukhrProjectNavigation =
    Object.freeze({
      resolveKey:stableKey,
      buildProjectUrl:projectUrl,
      navigate:function(value){
        const url = projectUrl(value);
        if(url) window.location.assign(url);
      }
    });

})(window,document);
