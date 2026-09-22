(function(global){
  'use strict';
  const state={mode:'booting',user:null,role:'sin_acceso',authorized:false,ready:false};
  let resolveReady; const readyPromise=new Promise(r=>resolveReady=r);
  const roleLabels={admin:'Administrador',contabilidad:'Contabilidad',consulta:'Consulta','sin_acceso':'Sin acceso'};

  function ui(){return {
    gate:document.getElementById('authGate'),form:document.getElementById('loginForm'),email:document.getElementById('loginEmail'),password:document.getElementById('loginPassword'),
    error:document.getElementById('loginError'),status:document.getElementById('loginStatus'),user:document.getElementById('authUserLabel'),role:document.getElementById('authRoleLabel'),logout:document.getElementById('btnLogout')
  }}
  function gate(show){const u=ui(); if(u.gate) u.gate.classList.toggle('d-none',!show); document.body.classList.toggle('auth-gate-open',!!show)}
  function error(msg=''){const e=ui().error;if(!e)return;e.textContent=msg;e.classList.toggle('d-none',!msg)}
  function render(){const u=ui();if(u.user)u.user.textContent=state.user?.email|| (state.mode==='demo'?'Modo demostración':'');if(u.role)u.role.textContent=state.mode==='demo'?'Demo':(roleLabels[state.role]||state.role)}
  async function syncRole(user){
    const token=await user.getIdToken();
    const res=await fetch('/api/assign-role',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok) throw new Error(data.error||'No se pudo validar el acceso.');
    await user.getIdToken(true); const result=await user.getIdTokenResult(); return String(result.claims.role||data.role||'sin_acceso');
  }
  async function init(){
    try{
      const r=await fetch('/api/client-config',{cache:'no-store'}); const cfg=await r.json();
      if(!r.ok||!cfg.ok||!global.firebase){
        state.mode='demo'; state.authorized=true; state.ready=true; gate(false); render(); resolveReady(state); return state;
      }
      state.mode='firebase';
      if(!firebase.apps.length) firebase.initializeApp(cfg.firebaseConfig);
      await new Promise(resolve=>firebase.auth().onAuthStateChanged(async user=>{
        try{
          if(!user){state.user=null;state.role='sin_acceso';state.authorized=false;gate(true);render();return;}
          state.user=user; state.role=await syncRole(user); state.authorized=['admin','contabilidad','consulta'].includes(state.role);
          if(!state.authorized){ await firebase.auth().signOut(); error('Tu usuario no tiene acceso a esta aplicación.'); gate(true); resolve(); return; }
          gate(false);render();resolve();
        }catch(e){error(e.message||String(e));gate(true);resolve();}
      }));
    }catch(e){state.mode='demo';state.authorized=true;gate(false);render();}
    state.ready=true; resolveReady(state); return state;
  }
  async function signIn(email,password){
    error(''); const u=ui(); if(u.status)u.status.textContent='Validando...';
    try{await firebase.auth().signInWithEmailAndPassword(email,password);}catch(e){error('No se pudo iniciar sesión. Verifica correo y contraseña.');throw e;}finally{if(u.status)u.status.textContent='';}
  }
  async function signOut(){if(state.mode==='firebase'&&global.firebase)await firebase.auth().signOut();location.reload()}
  function token(){return state.user?.getIdToken()||Promise.resolve('')}
  function canWrite(){return state.mode==='demo'||['admin','contabilidad'].includes(state.role)}
  function canDelete(){return state.mode==='demo'||state.role==='admin'}

  document.addEventListener('DOMContentLoaded',()=>{
    const u=ui(); u.form?.addEventListener('submit',e=>{e.preventDefault();signIn(u.email.value.trim(),u.password.value).catch(()=>{});});
    u.logout?.addEventListener('click',signOut);
  });
  global.TRAuth={state,ready:()=>readyPromise,init,token,canWrite,canDelete,signOut};
})(window);
