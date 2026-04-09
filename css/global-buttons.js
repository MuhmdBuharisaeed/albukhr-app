/* ===== ALBUKHR DOCK NAV v3 ===== */

:root{
--albukhr-gold:#d4af37;
--albukhr-gold-light:#f6d776;
--albukhr-gold-dark:#b8962e;
}


/* MAIN CONTAINER */

.dock-nav{

position:fixed;
bottom:10px;
left:50%;
transform:translate(-50%,0);

width:92%;
max-width:480px;

background:linear-gradient(90deg,#0f7a3d,#1ec777);

border-radius:26px;

padding:10px 8px;

display:flex;
justify-content:space-between;
align-items:center;

box-shadow:0 10px 30px rgba(0,0,0,0.25);

z-index:1000;

transition:transform .35s ease;

}


/* ITEM */

.dock-item{

flex:1;

display:flex;
flex-direction:column;
align-items:center;
justify-content:center;

text-decoration:none;
color:white;

font-size:12px;
font-weight:600;

transition:.25s ease;

position:relative;

}


/* TEXT */

.dock-item span{

font-size:13px;
font-weight:600;

margin-top:2px;

}


/* ICON SIZE */

.dock-icon{

width:42px;
height:42px;

fill:white;

margin-bottom:4px;

}


/* WALLET CENTER STYLE */

.dock-item:nth-child(3){

background:rgba(255,255,255,0.15);

border-radius:16px;

padding:6px 0;

}


/* WALLET ICON BIGGER */

.dock-item:nth-child(3) .dock-icon{

width:46px;
height:46px;

}


/* ACTIVE ITEM */

.dock-item.active{

transform:translateY(-3px);

}


/* ACTIVE DOT */

.dock-item.active::after{

content:"";

width:6px;
height:6px;

background:#ffd84d;

border-radius:50%;

position:absolute;

bottom:4px;

}


/* HOVER EFFECT */

.dock-item:hover{

opacity:.9;

  }
