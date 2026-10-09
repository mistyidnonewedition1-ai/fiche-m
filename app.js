'use strict';
const $=s=>document.querySelector(s),app=$('#app');
const COL=['#8b6cff','#ff5c93','#22c9a8','#ffb23e','#4a9bff'];
const TYPES=['sigles','groupes','phrase','recap','texte'];
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const users=()=>LS('fm.user',[]);
let builtin=[],deferred=null;
const all=()=>[...builtin,...users()];
const get=id=>all().find(f=>f.id===id);
const isMine=id=>users().some(u=>u.id===id);
const accent=f=>COL[[...f.title].reduce((a,c)=>a+c.charCodeAt(0),0)%5];
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2200)};

const TPL=`# Audiovisuel : organismes
emoji: 🎬
> Sigles et sociétés à connaître

## [sigles] Les sigles
INA | Institut national de l'audiovisuel | Conserve les archives | Archives
SACEM | Société des auteurs, compositeurs et éditeurs de musique | Gère les droits musicaux | Musique

## [groupes] Les sociétés
Publiques: Radio France, France 2, France 3
Privées: TF1, M6, Canal+ | Financées par la pub

## [phrase] Phrase à retenir
INA archive, SACEM protège la musique.

## [recap] À retenir
INA = archives
SACEM = droits musicaux

## [texte] Notes
Texte libre.
- une puce
`;
const PROMPT=`Transforme la leçon ci-dessous en fiche mémoire, en respectant EXACTEMENT ce format (réponds uniquement avec le texte de la fiche, sans phrase autour) :\n\n${TPL}\nSections possibles : [sigles] (Sigle | Signification | Rôle | Mot-clé), [groupes] (Nom: élément1, élément2 | note facultative), [phrase], [recap] (Terme = définition courte), [texte]. Sois concis.\n\nLEÇON :\n`;

function parseText(t){
  const f={title:'Sans titre',emoji:'📘',desc:'',blocks:[]};let b=null,m;
  for(const raw of t.split(/\r?\n/)){
    const l=raw.trim();if(!l)continue;
    if(m=l.match(/^##\s*(?:\[(\w+)\])?\s*(.*)$/)){const x=(m[1]||'texte').toLowerCase().slice(0,4);
      b={type:TYPES.find(y=>y.startsWith(x))||'texte',title:m[2],items:[]};f.blocks.push(b);continue}
    if(m=l.match(/^#\s+(.+)/)){f.title=m[1];continue}
    if(!b){if(m=l.match(/^emoji:\s*(.+)/i))f.emoji=m[1].trim();else if(l[0]==='>')f.desc=l.slice(1).trim();continue}
    if(b.type==='sigles'){const p=l.split('|').map(s=>s.trim());b.items.push({t:p[0],m:p[1]||'',d:p[2]||'',k:p[3]||''})}
    else if(b.type==='groupes'){const[a,...n]=l.split('|'),j=a.indexOf(':');
      b.items.push({n:(j<0?a:a.slice(0,j)).trim(),i:j<0?[]:a.slice(j+1).split(',').map(s=>s.trim()).filter(Boolean),note:n.join('|').trim()})}
    else if(b.type==='recap'){const j=l.indexOf('=');b.items.push(j<0?{k:l,v:''}:{k:l.slice(0,j).trim(),v:l.slice(j+1).trim()})}
    else b.items.push(l);
  }
  return f;
}
function toText(f){
  let s=`# ${f.title}\nemoji: ${f.emoji||'📘'}\n${f.desc?'> '+f.desc+'\n':''}`;
  for(const b of f.blocks){s+=`\n## [${b.type}] ${b.title||''}\n`;
    for(const x of b.items)s+=(b.type==='sigles'?[x.t,x.m,x.d||'',x.k||''].join(' | ')
      :b.type==='groupes'?`${x.n}: ${x.i.join(', ')}${x.note?' | '+x.note:''}`
      :b.type==='recap'?`${x.k} = ${x.v}`:x)+'\n'}
  return s;
}
function norm(f,id){f.id=f.id||id;f.title=f.title||'Sans titre';f.emoji=f.emoji||'📘';f.desc=f.desc||'';
  f.blocks=(f.blocks||[]).filter(b=>b&&Array.isArray(b.items));return f}
function cards(f){
  const c=[];
  for(const b of f.blocks){
    if(b.type==='sigles')b.items.forEach(x=>c.push({q:x.t,a:[x.m,x.d].filter(Boolean).join(' — ')}));
    if(b.type==='recap')b.items.forEach(x=>c.push({q:x.k,a:x.v}));
    if(b.type==='groupes')b.items.forEach(x=>x.i.length&&c.push({q:x.n+' ?',a:x.i.join(', ')}));
  }
  return c.filter(x=>x.q&&x.a).map(x=>({...x,k:x.q+'|'+x.a}));
}

function route(){
  const[p,a]=location.hash.slice(2).split('/');document.body.classList.remove('test');
  if(p==='f')viewFiche(a);else if(p==='c')viewCards(a);else if(p==='new')viewEdit();else if(p==='e')viewEdit(a);else viewHome();
  scrollTo(0,0);
}

function viewHome(){
  const prog=LS('fm.prog',{});
  app.innerHTML=`<div class="top"><div><h1>🧠 Mes fiches</h1><p class="sub">Révise, teste-toi, ajoute tes leçons</p></div><button id="inst" class="btn" hidden>⬇️ Installer</button></div>
  <input id="q" class="search" placeholder="🔍 Rechercher une fiche…">
  <p id="ios" class="hint" hidden>Sur iPhone : touche Partager ⬆️ puis « Sur l’écran d’accueil ».</p>
  <div class="grid" id="list"></div>`;
  const draw=()=>{const q=$('#q').value.toLowerCase();
    $('#list').innerHTML=all().filter(f=>(f.title+f.desc).toLowerCase().includes(q)).map(f=>{
      const cs=cards(f),keys=new Set(cs.map(c=>c.k)),n=(prog[f.id]||[]).filter(k=>keys.has(k)).length,pc=cs.length?Math.round(n/cs.length*100):0;
      return `<a class="fc" href="#/f/${esc(f.id)}" style="--k:${accent(f)}"><span class="e">${esc(f.emoji)}</span><b>${esc(f.title)}</b><small>${esc(f.desc)}</small><small>${cs.length} cartes · ${pc}% sus</small><div class="bar"><i style="width:${pc}%"></i></div></a>`}).join('')
      +'<a class="fc add" href="#/new">＋ Nouvelle fiche</a>'};
  $('#q').oninput=draw;draw();
  if(deferred)$('#inst').hidden=false;
  $('#inst').onclick=async()=>{deferred.prompt();await deferred.userChoice;deferred=null;$('#inst').hidden=true};
  if(/iphone|ipad/i.test(navigator.userAgent)&&!navigator.standalone)$('#ios').hidden=false;
}

function block(b,n){
  const t=b.title?`<h2>${esc(b.title)}</h2>`:'';
  if(b.type==='sigles')return t+`<div class="list">${b.items.map((x,i)=>`<div class="row" style="--k:${COL[i%5]}"><div class="badge">${esc(x.t)}</div><div><div class="full ans">${esc(x.m)}</div>${x.d?`<div class="role ans">${esc(x.d)}</div>`:''}${x.k?`<span class="kw">${esc(x.k)}</span>`:''}</div></div>`).join('')}</div>`;
  if(b.type==='groupes')return t+`<div class="gr">${b.items.map((x,i)=>`<div class="box" style="--k:${COL[i%5]}"><h3>${esc(x.n)}</h3><div class="chips ans">${x.i.map(c=>`<span class="chip">${esc(c)}</span>`).join('')}</div>${x.note?`<p>${esc(x.note)}</p>`:''}</div>`).join('')}</div>`;
  if(b.type==='phrase')return t+`<div class="phrase">${b.items.map(esc).join('<br>')}</div>`;
  if(b.type==='recap')return t+`<div class="box rc">${b.items.map(x=>`<div><b>${esc(x.k)}</b><span class="ans">${esc(x.v)}</span></div>`).join('')}</div>`;
  return t+`<div class="box txt">${b.items.map(l=>/^[-•]\s/.test(l)?`<li>${esc(l.replace(/^[-•]\s/,''))}</li>`:`<p>${esc(l)}</p>`).join('')}</div>`;
}

function viewFiche(id){
  const f=get(id);if(!f)return location.hash='#/';
  const mine=isMine(id);
  app.innerHTML=`<nav class="nav"><a class="btn ghost" href="#/">←</a><span class="sp"></span><button id="tm" class="btn ghost">🙈 Mode test</button><a class="btn" href="#/c/${esc(id)}">🃏 Cartes</a></nav>
  <h1>${esc(f.emoji)} ${esc(f.title)}</h1><p class="sub">${esc(f.desc)}</p>${f.blocks.map(block).join('')}
  <div class="foot"><a class="btn ghost" href="#/e/${esc(id)}">${mine?'✏️ Modifier':'📄 Dupliquer / modifier'}</a>${mine?'<button id="del" class="btn ghost danger">🗑️ Supprimer</button>':''}</div>`;
  $('#tm').onclick=()=>{const on=document.body.classList.toggle('test');
    document.querySelectorAll('.ans.on').forEach(e=>e.classList.remove('on'));
    $('#tm').textContent=on?'👀 Tout afficher':'🙈 Mode test'};
  if(mine)$('#del').onclick=()=>{if(confirm('Supprimer cette fiche ?')){put('fm.user',users().filter(u=>u.id!==id));location.hash='#/'}};
}

function viewCards(id){
  const f=get(id);if(!f)return location.hash='#/';
  const cs=cards(f),prog=LS('fm.prog',{}),known=new Set(prog[id]||[]);
  let deck=cs.filter(c=>!known.has(c.k));if(!deck.length)deck=[...cs];
  deck.sort(()=>Math.random()-.5);
  let i=0,back=false,ok=0;
  const save=()=>{prog[id]=[...known];put('fm.prog',prog)};
  const head=`<nav class="nav"><a class="btn ghost" href="#/f/${esc(id)}">←</a><span class="sp"></span></nav><h1>${esc(f.emoji)} ${esc(f.title)}</h1>`;
  const draw=()=>{
    if(!cs.length){app.innerHTML=head+'<p class="sub">Cette fiche n’a pas encore de cartes (ajoute des sections sigles, recap ou groupes).</p>';return}
    if(i>=deck.length){app.innerHTML=head+`<div class="box" style="text-align:center"><h2>🎉 Terminé !</h2><p>${ok} / ${deck.length} sus cette fois · ${known.size} / ${cs.length} au total</p><div class="foot" style="justify-content:center"><button id="again" class="btn">🔁 Continuer</button><button id="rst" class="btn ghost">↺ Tout réinitialiser</button></div></div>`;
      $('#again').onclick=()=>viewCards(id);
      $('#rst').onclick=()=>{delete prog[id];put('fm.prog',prog);viewCards(id)};return}
    const c=deck[i];
    app.innerHTML=head+`<p class="prog">${i+1} / ${deck.length}</p><div class="deck"><div class="card${back?' back':''}" id="cd"><div><small>${back?'Réponse':'Question'}</small>${esc(back?c.a:c.q)}</div></div></div>
    <div class="acts" ${back?'':'style="visibility:hidden"'}><button id="no" class="btn ghost">😕 À revoir</button><button id="yes" class="btn">✅ Je sais</button></div>`;
    $('#cd').onclick=()=>{back=!back;draw()};
    if(back){$('#yes').onclick=()=>{known.add(c.k);ok++;save();i++;back=false;draw()};$('#no').onclick=()=>{known.delete(c.k);save();i++;back=false;draw()}}
  };
  draw();
}

function viewEdit(id){
  const o=id&&get(id),mine=o&&isMine(id);
  app.innerHTML=`<nav class="nav"><a class="btn ghost" href="${o?'#/f/'+esc(id):'#/'}">←</a><span class="sp"></span></nav>
  <h1>${o?(mine?'✏️ Modifier la fiche':'📄 Dupliquer la fiche'):'➕ Nouvelle fiche'}</h1>
  <p class="sub">Colle ton texte, importe un fichier (.txt, .md, .json) ou demande à une IA de le formater.</p>
  <textarea id="tx" spellcheck="false">${esc(o?toText(o):TPL)}</textarea>
  <div class="foot" style="margin:0"><label class="btn ghost">📂 Importer un fichier<input id="fi" type="file" accept=".json,.txt,.md,text/plain,application/json" hidden></label><button id="cp" class="btn ghost">🤖 Copier le prompt IA</button><button id="sv" class="btn">💾 Enregistrer</button></div>
  <details><summary>📖 Comment ça marche ?</summary><pre>1. « Copier le prompt IA », colle-le dans ChatGPT / Claude, puis ajoute ta leçon à la fin.
2. Colle la réponse ici et enregistre.

Sections : [sigles] [groupes] [phrase] [recap] [texte]
Les cartes de révision sont créées automatiquement depuis sigles, recap et groupes.</pre></details>`;
  $('#fi').onchange=async e=>{const f=e.target.files[0];if(f)$('#tx').value=await f.text()};
  $('#cp').onclick=async()=>{try{await navigator.clipboard.writeText(PROMPT);toast('Prompt copié ✅')}catch{toast('Copie impossible')}};
  $('#sv').onclick=()=>{
    const t=$('#tx').value.trim();let f;
    try{f=t[0]==='{'?JSON.parse(t):parseText(t)}catch{return toast('JSON invalide')}
    f=norm(f,'');if(!f.blocks.length)return toast('Aucune section trouvée');
    const nid=mine?id:'u'+Date.now();f.id=nid;
    const u=users();const k=u.findIndex(x=>x.id===nid);k<0?u.unshift(f):u[k]=f;put('fm.user',u);
    toast('Fiche enregistrée ✅');location.hash='#/f/'+nid;
  };
}

async function load(){
  try{
    const ix=await(await fetch('data/index.json')).json();
    builtin=(await Promise.all(ix.fiches.map(async n=>{try{
      const r=await fetch('data/'+n);
      return norm(n.endsWith('.json')?await r.json():parseText(await r.text()),n.replace(/\.\w+$/,''))}catch{return null}}))).filter(Boolean);
  }catch{}
  route();
}
document.addEventListener('click',e=>{const a=e.target.closest('.ans');if(a&&document.body.classList.contains('test'))a.classList.toggle('on')});
window.addEventListener('hashchange',route);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=$('#inst');if(b)b.hidden=false});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
load();
