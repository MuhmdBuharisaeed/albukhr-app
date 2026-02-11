function openWallet(){
  const gate = albukhrCanProceed("wallet");

  if(!gate.allowed){
    alert(gate.message);
    return;
  }

  // wallet logic here
}

// Load unified engine BEFORE wallet-core.js
<script src="internal-project-engine.js"></script>
<script src="external-project-engine.js"></script>
<script src="project-unified-engine.js"></script>
<script src="wallet-core.js"></script>
