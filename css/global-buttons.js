/* ===== ALBUKHR DOCK NAV v3 ===== */
:root{
  --albukhr-gold:#d4af37;
  --albukhr-gold-light:#f6d776;
  --albukhr-gold-dark:#b8962e;
}

.dock-nav{
position:fixed;
bottom:10px;
left:50%;
transform:translateX(-50%);
width:92%;
max-width:480px;

background:linear-gradient(90deg,#0f7a3d,#1ec777);

border-radius:26px;
padding:8px 6px;

display:flex;
justify-content:space-between;
align-items:center;

box-shadow:0 10px 30px rgba(0,0,0,0.25);

z-index:1000;
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

font-size:11px;
font-weight:600;

transition:.25s ease;

position:relative;
}

.dock-item span{
font-size:34px;
font-weight:600;
margin-top:2px;
}

/* ICON SIZE */

.dock-icon{
width:36px;
height:36px;
fill:white;
margin-bottom:4px;
}

/* WALLET CENTER STYLE */

.dock-item:nth-child(3){
background:rgba(255,255,255,0.15);
border-radius:16px;
padding:6px 0;
}

.dock-item.active .dock-icon{
width:40px;
height:40px;
}
/* WALLET ICON BIGGER */

.dock-item:nth-child(3) .dock-icon{
width:32px;
height:32px;
}

/* ACTIVE EFFECT */

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

/* HOVER */

.dock-item:hover{
opacity:.9;
   }

