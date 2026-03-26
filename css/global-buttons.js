/* ===== ALBUKHR BOTTOM NAV (iOS Style) ===== */

:root{
--albukhr-green:#0f7a3d;
--albukhr-gray:#888;
}


/* MAIN CONTAINER */

.dock-nav{

position:fixed;
bottom:0;
left:0;
right:0;

height:72px;

background:#ffffff;

border-top:1px solid #eaeaea;

display:flex;
justify-content:space-around;
align-items:center;

z-index:1000;

padding-bottom:6px;

}


/* ITEM */

.dock-item{

flex:1;

display:flex;
flex-direction:column;
align-items:center;
justify-content:center;

text-decoration:none;

color:var(--albukhr-gray);

font-size:11px;
font-weight:500;

transition:.2s ease;

position:relative;

}


/* TEXT */

.dock-item span{

font-size:12px;
margin-top:3px;

}


/* ICON */

.dock-icon{

width:24px;
height:24px;

fill:currentColor;

}


/* REMOVE CENTER WALLET STYLE */

.dock-item:nth-child(3){
background:none;
padding:0;
}

.dock-item:nth-child(3) .dock-icon{
width:24px;
height:24px;
}


/* ACTIVE */

.dock-item.active{

color:var(--albukhr-green);

transform:none;

}


/* ACTIVE DOT */

.dock-item.active::after{

content:"";

width:5px;
height:5px;

background:var(--albukhr-green);

border-radius:50%;

margin-top:3px;

}


/* HOVER */

.dock-item:hover{
opacity:.8;
  }
