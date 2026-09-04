/* ALBUKHR External Projects Dashboard - RPC identity/network architecture */
(function (window) {
  'use strict';
  let currentUser = null, currentApplications = [];
  const $ = id => document.getElementById(id);
  const status = (m,t) => { const e=$('dashboardStatus'); if(e){e.textContent=m||'';e.className='dashboard-status'+(t?' '+t:'');} };
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const fmt=v=>{if(!v)return'Not available';const d=new Date(v);return Number.isNaN(d)?String(v):d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});};
  const norm=s=>String(s||'draft').trim().toLowerCase().replace(/\s+/g,'_');
  const label=s=>norm(s).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  function deps(){if(!window.ALBukhrEnvironment||!window.ALBUKHR_SUPABASE||!window.AlbukhrPageAuthGuard)throw new Error('Required ALBUKHR core dependency is unavailable.');}
  function piUid(){return String(currentUser?.pi_uid||currentUser?.uid||currentUser?.username||currentUser?.user_id||'').trim();}
  async function load(){
    status('Loading your secure project applications...');
    const network=window.ALBukhrEnvironment.getNetwork(); const uid=piUid();
    if(!['mainnet','testnet'].includes(network))throw new Error('Invalid ALBUKHR network.');
    if(!uid)throw new Error('Pi identity is unavailable.');
    const {data,error}=await window.ALBUKHR_SUPABASE.rpc('get_my_external_project_applications',{p_pi_uid:uid,p_network:network});
    if(error)throw error;
    currentApplications=Array.isArray(data)?data:[]; render(); status(currentApplications.length?'Applications loaded securely.':'No external project applications found.','success');
  }
  function render(){const list=$('projectsList'),empty=$('emptyState'),sub=$('applicationsSubtitle'),count=$('sectionCount'); if(!list||!empty)return;list.innerHTML='';const total=currentApplications.length;
    if(sub)sub.textContent=total?`${total} application${total===1?'':'s'} in your workspace`:'Your applications will appear here.'; if(count)count.textContent=total;
    const progress=currentApplications.filter(x=>!['approved','rejected','converted'].includes(norm(x.status))).length, approved=currentApplications.filter(x=>norm(x.status)==='approved').length;
    if($('totalCount'))$('totalCount').textContent=total;if($('progressCount'))$('progressCount').textContent=progress;if($('approvedCount'))$('approvedCount').textContent=approved;
    if(!total){empty.hidden=false;return;}empty.hidden=true;
    currentApplications.forEach(item=>{const s=norm(item.status),name=item.project_name||item.business_name||item.project_code||'External Project',code=item.project_code||item.application_code||item.id,card=document.createElement('article');card.className='project-card';card.innerHTML=`<div class="project-card-top"><div><h3>${esc(name)}</h3><div class="project-code">${esc(code)}</div></div><span class="status-chip status-${esc(s)}">${esc(label(s))}</span></div><p class="project-description">${esc(item.project_description||'No project description available.')}</p><div class="project-meta"><span class="meta-chip">${esc(item.category||item.industry||'External')}</span><span class="meta-chip">${esc(window.ALBukhrEnvironment.getNetwork().toUpperCase())}</span></div><div class="project-card-footer"><span>Created ${esc(fmt(item.created_at))}</span><span class="view-link">View details →</span></div>`;card.addEventListener('click',()=>open(item));list.appendChild(card);});
  }
  async function open(item){const modal=$('projectModal');if(!modal)return;const uid=piUid(),network=window.ALBukhrEnvironment.getNetwork();let detail=item;
    try{const {data,error}=await window.ALBUKHR_SUPABASE.rpc('get_my_external_project_detail',{p_application_id:item.id,p_pi_uid:uid,p_network:network});if(!error&&data)detail=Array.isArray(data)?(data[0]||item):data;}catch(e){console.warn('[ALBUKHR EXTERNAL DETAIL]',e);}
    const s=norm(detail.status),name=detail.project_name||detail.business_name||'External Project';$('modalTitle').textContent=name;$('modalStatus').innerHTML=`<span class="status-chip status-${esc(s)}">${esc(label(s))}</span>`;
    const d=(l,v,f)=>`<div class="detail-item${f?' full':''}"><span>${esc(l)}</span><strong>${esc(v||'Not available')}</strong></div>`;
    $('modalGrid').innerHTML=d('Project Code',detail.project_code||detail.application_code||detail.id)+d('Status',label(s))+d('Business',detail.business_name)+d('Industry',detail.industry||detail.category)+d('Country',detail.country)+d('Location',[detail.state,detail.city].filter(Boolean).join(', '))+d('Funding Required',detail.funding_required?`${detail.funding_required} ${detail.funding_asset||''}`:null)+d('Investment Model',detail.investment_model)+d('Duration',detail.project_duration_days?`${detail.project_duration_days} days`:null)+d('Created',fmt(detail.created_at))+d('Description',detail.project_description,true);
    const edit=$('modalEditButton'),editable=['draft','needs_revision','revision_requested','revision','changes_requested'].includes(s);edit.hidden=!editable;edit.onclick=()=>location.href='external-create.html?application_id='+encodeURIComponent(detail.id||item.id);modal.hidden=false;modal.setAttribute('aria-hidden','false');
  }
  const close=()=>{const m=$('projectModal');if(m){m.hidden=true;m.setAttribute('aria-hidden','true');}};
  function ui(){const go=()=>location.href='external-create.html';$('createProjectButton')?.addEventListener('click',go);$('emptyCreateButton')?.addEventListener('click',go);$('refreshButton')?.addEventListener('click',async function(){this.disabled=true;try{await load();}catch(e){status('Unable to refresh applications: '+(e.message||'Unknown error'),'error');}finally{this.disabled=false;}});$('modalCloseButton')?.addEventListener('click',close);$('modalCloseAction')?.addEventListener('click',close);document.addEventListener('click',e=>{if(e.target?.dataset.closeModal==='true')close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});}
  async function init(){try{deps();ui();currentUser=await window.AlbukhrPageAuthGuard.waitForAuth();if(!currentUser)return;const n=window.ALBukhrEnvironment.getNetwork();$('networkIndicator').textContent=n.toUpperCase();$('summaryUsername').textContent=currentUser.username||currentUser.pi_username||'ALBUKHR User';$('summaryNetwork').textContent='Authenticated with Pi • '+n.toUpperCase();$('summaryAvatar').textContent=String(currentUser.username||currentUser.pi_username||'A').charAt(0).toUpperCase();await load();}catch(e){console.error('[ALBUKHR EXTERNAL DASHBOARD]',e);status('Dashboard unavailable: '+(e.message||'Unknown error'),'error');}}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})(window);
