'use strict';
const PATH='data/',API=(window.MLBB_CONFIG?.API_URL||'').replace(/\/$/,'');
let token=sessionStorage.getItem('uqec-mlbb-session')||'', revisions={};
const online=()=>API&& !API.includes('REPLACE-WITH');
async function api(path,options={}){let res=await fetch(API+path,{...options,cache:'no-store',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})}});let json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||('HTTP '+res.status));return json;}
function banner(msg){let el=document.getElementById('syncBanner');if(el)el.textContent=msg;}
const DRAFT_KEY='uqec-mlbb-v111-draft';
let sourceMode='loading',pendingDraft=null;
function getDraft(){try{let d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');return d&&d.datasets&&d.savedAt?d:null}catch{return null}}
function captureDraft(kinds){const existing=getDraft(),datasets={...(existing?.datasets||{})};for(const k of kinds)datasets[k]=toCSV(db[k],required[k]);const d={savedAt:new Date().toISOString(),datasets,baseShas:{...(existing?.baseShas||revisions)}};localStorage.setItem(DRAFT_KEY,JSON.stringify(d));pendingDraft=d;showRecovery();banner('Unpublished edits kept on this browser · Export backup before closing');return d;}
function clearDraftKinds(kinds){const d=getDraft();if(!d)return;for(const k of kinds)delete d.datasets[k];if(Object.keys(d.datasets).length)localStorage.setItem(DRAFT_KEY,JSON.stringify(d));else localStorage.removeItem(DRAFT_KEY);pendingDraft=getDraft();showRecovery();}
function showRecovery(){const d=getDraft(),panel=$('recoveryPanel');if(!panel)return;panel.hidden=!d;$('recoveryInfo').textContent=d?'Local unpublished backup from '+new Date(d.savedAt).toLocaleString()+' ('+Object.keys(d.datasets).join(', ')+'). Export it; compare with GitHub before publishing.':'';}
function exportDraft(){const d=getDraft();if(!d){toast('No pending backup.');return}for(const [kind,body] of Object.entries(d.datasets))download(kind+'-UNPUBLISHED.csv',body);toast('Unpublished CSV files downloaded.');}
async function publish(kind){if(!online())throw Error('Worker API not configured.');const out=await api('/api/data/'+kind,{method:'PUT',body:JSON.stringify({csv:toCSV(db[kind],required[kind]),sha:revisions[kind]})});revisions[kind]=out.sha;return out;}
async function reloadLive({discard=false}={}){if(getDraft()&&!discard)throw Error('Unpublished local edits exist. Export/review or discard them before reloading.');const obj=await api('/api/data');const next={};for(const k of Object.keys(required))next[k]=parseCSV(obj.datasets[k]);for(const k of Object.keys(required)){db[k]=next[k];revisions[k]=obj.shas[k]}sourceMode='live';syncPlayoff();render();banner('Live · GitHub API connected');}
async function loadPublishedCSV(){const next={};for(const kind of Object.keys(required)){const res=await fetch(PATH+kind+'.csv?ts='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('Published '+kind+'.csv returned HTTP '+res.status);next[kind]=parseCSV(await res.text())}if(getDraft()) {pendingDraft=getDraft(); banner('GitHub Pages fallback · Unpublished local edits are backed up. Export before editing.');}for(const k of Object.keys(required))db[k]=next[k];sourceMode='fallback';syncPlayoff();render();banner(getDraft()?'Published CSV fallback · Unpublished edits are backed up':'Published CSV fallback · Automatic saving unavailable; data may lag behind GitHub');}
async function load(){try{if(online()){await reloadLive();return}}catch(err){console.warn('Worker unavailable, loading published CSV:',err)}await loadPublishedCSV();}

const required={teams:['team_id','team_name','group'],players:['player_id','team_id','roster_position','name_my','name_en','class','review_status'],matches:['match_id','stage','group','round','team1','team2','score1','score2','status','time','kills1','kills2','deaths1','deaths2','duration_seconds'],seeds:['slot','team_id']};
let db={teams:[],players:[],matches:[],seeds:[]},unlocked=false;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function parseCSV(source){source=source.replace(/^\uFEFF/,'');let records=[],row=[],field='',quotes=false;for(let i=0;i<source.length;i++){let ch=source[i];if(quotes){if(ch==='"'&&source[i+1]==='"'){field+='"';i++}else if(ch==='"')quotes=false;else field+=ch}else if(ch==='"')quotes=true;else if(ch===','){row.push(field);field=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&source[i+1]==='\n')i++;row.push(field);field='';if(row.some(x=>x!==''))records.push(row);row=[]}else field+=ch}if(quotes)throw Error('Unclosed quotation mark in CSV');if(field!==''||row.length){row.push(field);records.push(row)}let headers=records.shift()||[];return records.map(r=>Object.fromEntries(headers.map((h,i)=>[h.trim(),r[i]??''])))}
function toCSV(rows,fields){const enc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\uFEFF'+fields.map(enc).join(',')+'\r\n'+rows.map(row=>fields.map(k=>enc(row[k])).join(',')).join('\r\n')+'\r\n'}
function toast(text){const el=$('toast');el.textContent=text;el.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.display='none',3800)}
const team=id=>db.teams.find(x=>x.team_id===id),tn=id=>id?(team(id)?.team_name||id):'TBD',game=id=>db.matches.find(m=>m.match_id===id),done=m=>m?.status==='completed'&&validScore(m),validScore=m=>m&&m.score1!==''&&m.score2!==''&&Number.isInteger(+m.score1)&&Number.isInteger(+m.score2)&&+m.score1>=0&&+m.score2>=0&&+m.score1!==+m.score2;
const bestOf=m=>m?.match_id==='GF'?5:m?.stage==='group'||['U1','U2','U3','U4','U5','U6','L1','L2','L3','L4'].includes(m?.match_id)?1:3;
const requiredWins=m=>Math.floor(bestOf(m)/2)+1;
const bestOfLabel=m=>'BO'+bestOf(m);
const winner=m=>done(m)?(+m.score1>+m.score2?m.team1:m.team2):'',loser=m=>done(m)?(+m.score1<+m.score2?m.team1:m.team2):'';
// Tournament rules: wins > two-team head-to-head > for 3+ teams: kill differential,
// total kills, cumulative VICTORY duration. Exact unresolved ties need organizer random draw.
function completedGroupMatches(g){return db.matches.filter(m=>m.stage==='group'&&m.group===g&&done(m))}
function statsReady(m){return ['kills1','kills2','deaths1','deaths2','duration_seconds'].every(k=>/^\d+$/.test(String(m[k]??'')))&&+m.duration_seconds>0}
function headToHead(a,b,g){let m=completedGroupMatches(g).find(m=>[m.team1,m.team2].includes(a.id)&&[m.team1,m.team2].includes(b.id));if(!m)return 0;return winner(m)===a.id?-1:winner(m)===b.id?1:0}
function standings(group){
 let rows=db.teams.filter(t=>t.group===group).map(t=>({id:t.team_id,name:t.team_name,p:0,w:0,l:0,kills:0,deaths:0,kd:0,winDuration:0,statsMissing:false,unresolved:false,rankNote:''}));
 for(const m of completedGroupMatches(group))for(const [id,ks,ds] of [[m.team1,'kills1','deaths1'],[m.team2,'kills2','deaths2']]){
  let v=rows.find(x=>x.id===id);if(!v)continue;v.p++;if(winner(m)===id){v.w++;if(statsReady(m))v.winDuration+=+m.duration_seconds}else v.l++;
  if(statsReady(m)){v.kills+=+m[ks];v.deaths+=+m[ds]}else v.statsMissing=true;
 }
 rows.forEach(v=>v.kd=v.kills-v.deaths);
 let sorted=[];const points=[...new Set(rows.map(v=>v.w))].sort((a,b)=>b-a);
 for(const pointsValue of points){let tied=rows.filter(v=>v.w===pointsValue);
  if(tied.length===2){tied.sort((a,b)=>headToHead(a,b,group));tied.forEach(v=>v.rankNote='Head-to-head');if(!completedGroupMatches(group).some(m=>[m.team1,m.team2].includes(tied[0].id)&&[m.team1,m.team2].includes(tied[1].id)))tied.forEach(v=>v.unresolved=true)}
  else if(tied.length>2){
   if(tied.some(v=>v.statsMissing)){tied.forEach(v=>{v.unresolved=true;v.rankNote='Missing kill/death/duration data'})}
   else {tied.sort((a,b)=>b.kd-a.kd||b.kills-a.kills||a.winDuration-b.winDuration);
    for(let i=0;i<tied.length;){let j=i+1;while(j<tied.length&&tied[i].kd===tied[j].kd&&tied[i].kills===tied[j].kills&&tied[i].winDuration===tied[j].winDuration)j++;
     if(j-i===2){let pair=tied.slice(i,j).sort((a,b)=>headToHead(a,b,group));tied.splice(i,2,...pair);if(headToHead(pair[0],pair[1],group)===0)pair.forEach(v=>v.unresolved=true)}
     else if(j-i>2)tied.slice(i,j).forEach(v=>v.unresolved=true);
     i=j;
    }
    tied.forEach(v=>v.rankNote=v.unresolved?'Supervised draw required':'Kill differential / kills / victory duration');
   }
  }
  sorted.push(...tied);
 }
 return sorted;
}
function groupComplete(g){return db.matches.filter(m=>m.stage==='group'&&m.group===g).every(done)}
function tiedAtQualification(g){let s=standings(g);return !groupComplete(g)||s.some(v=>v.unresolved);}
function seeds(){let slots={};let custom=db.seeds.filter(s=>s.team_id);if(custom.length){if(custom.length!==8||new Set(custom.map(x=>x.team_id)).size!==8)return null;for(const s of custom)slots[s.slot]=s.team_id;return Object.keys(slots).length===8?slots:null}if(!'ABCD'.split('').every(g=>groupComplete(g)&&!tiedAtQualification(g)))return null;for(const g of 'ABCD'){let a=standings(g);slots[g+'1']=a[0].id;slots[g+'2']=a[1].id}return slots}
// Standard 8-team double elimination. No bracket-reset grand final.
const routes={U1:[['seed','A1'],['seed','B2']],U2:[['seed','C1'],['seed','D2']],U3:[['seed','B1'],['seed','A2']],U4:[['seed','D1'],['seed','C2']],U5:[['win','U1'],['win','U2']],U6:[['win','U3'],['win','U4']],U7:[['win','U5'],['win','U6']],L1:[['lose','U1'],['lose','U2']],L2:[['lose','U3'],['lose','U4']],L3:[['win','L1'],['lose','U6']],L4:[['win','L2'],['lose','U5']],L5:[['win','L3'],['win','L4']],L6:[['win','L5'],['lose','U7']],GF:[['win','U7'],['win','L6']]};
function playoff(){let seeded=seeds(),resolved={};for(const id of ['U1','U2','U3','U4','U5','U6','L1','L2','L3','L4','U7','L5','L6','GF']){let target=game(id),r=routes[id].map(([type,key])=>type==='seed'?seeded?.[key]||'':type==='win'?winner(resolved[key]):loser(resolved[key]));let m={...target,team1:r[0],team2:r[1]};if(m.team1!==target.team1||m.team2!==target.team2){m.score1='';m.score2='';m.status='scheduled'}resolved[id]=m}return resolved}
function syncPlayoff(){let computed=playoff();for(let id of Object.keys(computed)){let m=game(id),x=computed[id];if(m.team1!==x.team1||m.team2!==x.team2){m.team1=x.team1;m.team2=x.team2;m.score1='';m.score2='';m.status='scheduled'}}}
// Exhibition-only projected bracket participants. No projected result is saved or scored.
// Existing real results always take priority; actual entry assignments still derive from real winners.
const demoPicks={U1:0,U2:1,U3:0,U4:1,U5:1,U6:0,L1:0,L2:1,L3:0,L4:1,U7:0,L5:1,L6:0};
function demoBracket(){ return null; /* disabled for official tournament

  const start=seeds();if(!start)return null;
  let result={};
  for(const id of ['U1','U2','U3','U4','U5','U6','L1','L2','L3','L4','U7','L5','L6','GF']){
    const actual=game(id);
    const members=routes[id].map(([type,key])=>type==='seed'?start[key]:type==='win'?(winner(result[key])||result[key]?.projectedWinner||''):(loser(result[key])||result[key]?.projectedLoser||''));
    const m={...actual,team1:actual.team1||members[0],team2:actual.team2||members[1]};
    const idx=demoPicks[id]??0;
    m.projectedWinner=winner(m)||(idx===0?m.team1:m.team2);
    m.projectedLoser=loser(m)||(idx===0?m.team2:m.team1);
    m.projected=!actual.team1||!actual.team2;
    result[id]=m;
  }
  return result;
}
*/ }
function displayMatch(m){return m}
function persist(kind){}
function persistAll(){}
function matchHtml(m){m=displayMatch(m);let isDone=done(m),a=esc(tn(m.team1)),b=esc(tn(m.team2));return `<article class="fixture"><div class="meta"><strong>${esc(m.match_id)} · ${esc(bestOfLabel(m))} · ${esc(m.round||('Group '+m.group))}</strong>${esc(m.time||'Time TBA')}</div><div class="versus"><span class="side">${a}</span><span class="score">${isDone||m.status==='live'?esc(m.score1||'0')+' : '+esc(m.score2||'0'):'VS'}</span><span class="side">${b}</span></div><div class="state ${esc(m.status)}">${m.projected?'DEMO · projected teams':esc(m.status)}</div></article>`}
function splitRoomTime(m){let t=String(m.time||'');let x=t.match(/^(\d{4}-\d\d-\d\d \d\d:\d\d) \| (F[12]R[1-4]) vs (F[12]R[1-4])$/);return x?{at:x[1],a:x[2],b:x[3]}:null}
function renderRooms(){
 const select=$('roomWave'),board=$('roomBoard');if(!select||!board)return;
 const waves=[...new Set(db.matches.map(m=>splitRoomTime(m)?.at).filter(Boolean))].sort();
 let chosen=select.value;if(!waves.includes(chosen))chosen=waves[0]||'';
 select.innerHTML=waves.map(v=>`<option value="${esc(v)}">${v.startsWith('2026-10-31')?'Day 1':'Day 2'} · ${esc(v.slice(11))}</option>`).join('');select.value=chosen;
 if(!chosen){board.innerHTML='<p class="muted">No room assignments available.</p>';return}
 const occupancy=Object.fromEntries(['F1R1','F1R2','F1R3','F2R1','F2R2','F2R3','F2R4'].map(id=>[id,[]]));
 for(const raw of db.matches){const v=splitRoomTime(raw);if(!v||v.at!==chosen)continue;const m=displayMatch(raw);
  occupancy[v.a].push({name:tn(m.team1),match:m.match_id,opponent:tn(m.team2),other:v.b,format:bestOfLabel(m)});
  occupancy[v.b].push({name:tn(m.team2),match:m.match_id,opponent:tn(m.team1),other:v.a,format:bestOfLabel(m)});
 }
 board.innerHTML=['F1','F2'].map(f=>`<section class="room-floor"><h2>${f==='F1'?'Floor 1':'Floor 2'}</h2><div class="room-floor-grid">${(f==='F1'?[1,2,3]:[1,2,3,4]).map(n=>{
  const id=f+'R'+n,teams=occupancy[id];return `<article class="room-station"><h3>${id}<small>${teams.length}/${f==='F1'?3:2} teams</small></h3>${teams.length?teams.map(t=>`<div class="room-occupant"><b>${esc(t.name)}</b><span>${esc(t.match)} · ${esc(t.format)} · vs ${esc(t.opponent)} (${esc(t.other)})</span></div>`).join(''):'<p class="muted">Available / standby</p>'}</article>`;
 }).join('')}</div></section>`).join('');
}
function renderHome(){let groups=db.matches.filter(x=>x.stage==='group'),play=db.matches.filter(x=>x.stage!=='group');$('statTeams').textContent=db.teams.length;$('statGroup').textContent=groups.filter(done).length+' / '+groups.length;$('statPlayoffs').textContent=play.filter(done).length+' / '+play.length;let champ=winner(game('GF'));$('statStatus').textContent=champ?'CHAMPION':db.matches.some(x=>x.status==='live')?'IN PROGRESS':db.matches.some(done)?'UNDERWAY':'UPCOMING';$('championText').textContent=champ?tn(champ):'The title is waiting';let recent=db.matches.filter(done).slice(-3).reverse(),coming=db.matches.filter(x=>x.status==='live').concat(db.matches.filter(x=>x.status==='scheduled')).slice(0,3);$('homeMatches').innerHTML=[...recent,...coming].slice(0,5).map(m=>`<div class="mini-match"><small>${esc(m.match_id)} · ${esc(bestOfLabel(m))} · ${esc(m.status)} ${esc(m.time||'')}</small><strong>${esc(tn(displayMatch(m).team1))} ${done(m)?m.score1+'–'+m.score2:'vs'} ${esc(tn(displayMatch(m).team2))}</strong></div>`).join('')||'<p class="muted">No matches yet.</p>'}
function renderGroups(){$('groupsGrid').innerHTML='ABCD'.split('').map(g=>{const s=standings(g);return `<section class="groupcard"><h2>GROUP ${g}</h2><table><thead><tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>K</th><th>D</th><th>K±</th></tr></thead><tbody>${s.map((v,i)=>`<tr class="${i<2?'qualifier':''}"><td><span class="rank">${i+1}</span>${esc(v.name)}${v.unresolved?' ⚠':''}</td><td>${v.p}</td><td>${v.w}</td><td>${v.l}</td><td>${v.statsMissing?'—':v.kills}</td><td>${v.statsMissing?'—':v.deaths}</td><td>${v.statsMissing?'—':v.kd}</td></tr>`).join('')}</tbody></table><p class="muted">${groupComplete(g)?'Group complete':'Awaiting results'}${tiedAtQualification(g)&&groupComplete(g)?' · Unresolved ranking: record stats or conduct supervised draw and set manual seeds':''}</p></section>`}).join('')}
function renderFixtures(){
  const st=$('stageFilter').value,ss=$('statusFilter').value;
  const matches=db.matches.filter(m=>(st==='all'||m.stage===st)&&(ss==='all'||m.status===ss));
  const groups='ABCD'.split('').map(g=>({group:g,matches:matches.filter(m=>m.stage==='group'&&m.group===g)})).filter(x=>x.matches.length);
  const playoffs=matches.filter(m=>m.stage!=='group');
  const previous=new Map([...$('fixtureList').querySelectorAll('details[data-fixture-group]')].map(el=>[el.dataset.fixtureGroup,el.open]));
  const grouped=groups.map(({group,matches:items})=>{
    const finished=items.filter(done).length;
    const open=previous.has(group)?previous.get(group):true;
    return `<details class="fixture-group" data-fixture-group="${group}" ${open?'open':''}><summary><span class="fixture-group-title"><span class="fixture-group-badge">${group}</span><span><strong>Group ${group}</strong><small>${items.length} fixture${items.length===1?'':'s'} · BO1</small></span></span><span class="fixture-group-count">${finished}/${items.length} <span class="fixture-chevron" aria-hidden="true">⌄</span></span></summary><div class="fixture-group-body">${items.map(matchHtml).join('')}</div></details>`;
  }).join('');
  const other=playoffs.length?`<div class="fixture-playoffs-matches">${playoffs.map(matchHtml).join('')}</div>`:'<p class="muted">No playoff fixtures match this filter.</p>';
  $('fixtureList').innerHTML=`<div class="fixture-columns"><section class="fixture-column" aria-label="Group stage fixtures"><div class="fixture-column-heading"><h2>Group Stage</h2><small>Round robin · 21 BO1 fixtures</small></div>${grouped||'<p class="muted">No group fixtures match this filter.</p>'}</section><section class="fixture-column" aria-label="Playoff fixtures"><div class="fixture-column-heading"><h2>Playoffs</h2><small>Double elimination · 14 fixtures</small></div>${other}</section></div>`;
}
function renderBracket(){let resolved=playoff();$('seedWarning').textContent=seeds()?'Live tournament bracket · Later-round entrants advance only after official match results are recorded.':'Official tournament · Playoff entrants will appear when groups finish or eight seeds are confirmed.';let sets=[['UPPER BRACKET',[['Quarterfinals',['U1','U2','U3','U4']],['Semifinals',['U5','U6']],['Upper final',['U7']]]],['LOWER BRACKET',[['Round 1',['L1','L2']],['Round 2',['L3','L4']],['Round 3',['L5']],['Lower final',['L6']]]],['GRAND FINAL',[['Championship',['GF']]]]];$('bracketBoard').innerHTML=sets.map(([title,rounds])=>`<section class="bracket-section"><h2>${title}</h2><div class="bracket-rounds">${rounds.map(([label,ids])=>`<div class="bracket-round"><h3>${label}</h3>${ids.map(id=>{let m=resolved[id];return `<div class="bracket-match"><small>${id} · ${bestOfLabel(m)}${done(m)?' · FINAL':m.projected?' · PROJECTED':''}</small>${[m.team1,m.team2].map((tid,i)=>`<div class="bracket-team ${winner(m)===tid&&tid?'win':''}"><span>${esc(tn(tid))}</span><i>${done(m)?esc(i===0?m.score1:m.score2):'—'}</i></div>`).join('')}</div>`}).join('')}</div>`).join('')}</div></section>`).join('')}
function renderTeams(){$('teamsGrid').innerHTML=db.teams.map(t=>`<article class="teamcard"><span class="group-tag">GROUP ${esc(t.group)} · ${esc(t.team_id)}</span><h2>${esc(t.team_name)}</h2><ul class="roster">${db.players.filter(p=>p.team_id===t.team_id).sort((a,b)=>+a.roster_position-+b.roster_position).map(p=>`<li><span class="${p.name_en?'':'unverified'}">${esc(p.name_en||'Name pending verification')}</span><small>${esc(p.class||'—')}</small></li>`).join('')}</ul></article>`).join('')}
function render(){syncPlayoff();renderHome();renderGroups();renderFixtures();renderRooms();renderBracket();renderTeams();if(unlocked)renderAdmin()}
function renderAdmin(){let current=$('editMatch').value;$('editMatch').innerHTML=db.matches.map(m=>`<option value="${esc(m.match_id)}">${esc(m.match_id)} · ${esc(bestOfLabel(m))} · ${esc(tn(displayMatch(m).team1))} vs ${esc(tn(displayMatch(m).team2))}</option>`).join('');if(db.matches.some(m=>m.match_id===current))$('editMatch').value=current;populateScore();let selected=$('editTeam').value;$('editTeam').innerHTML=db.teams.map(t=>`<option value="${esc(t.team_id)}">${esc(t.team_id)} · ${esc(t.team_name)}</option>`).join('');if(db.teams.some(t=>t.team_id===selected))$('editTeam').value=selected;populateRoster();$('seedEditors').innerHTML='ABCD'.split('').flatMap(g=>[1,2].map(n=>{let slot=g+n,current=db.seeds.find(s=>s.slot===slot)?.team_id||'';return `<label>Group ${g} · #${n}<select class="seed-select" data-slot="${slot}"><option value="">Automatic</option>${db.teams.filter(t=>t.group===g).map(t=>`<option value="${esc(t.team_id)}" ${current===t.team_id?'selected':''}>${esc(t.team_name)}</option>`).join('')}</select></label>`})).join('')}
function populateScore(){let m=game($('editMatch').value);if(!m)return;$('score1').value=m.score1;$('score2').value=m.score2;$('editStatus').value=m.status;for(const f of ['kills1','kills2','deaths1','deaths2','duration_seconds'])$(f).value=m[f]??'';$('groupStatsInputs').hidden=m.stage!=='group';$('editTime').value=m.time;const note=document.getElementById('bestOfHint');if(note)note.textContent=bestOfLabel(m)+' · winner needs '+requiredWins(m)+' game win(s)';}
function populateRoster(){let t=team($('editTeam').value);if(!t)return;$('teamName').value=t.team_name;$('rosterEditors').innerHTML=db.players.filter(p=>p.team_id===t.team_id).sort((a,b)=>+a.roster_position-+b.roster_position).map(p=>`<div class="player-edit" data-player="${esc(p.player_id)}"><span class="pid">${esc(p.player_id)}</span><label>Myanglish<input class="edit-en" value="${esc(p.name_en)}"></label><label>Burmese<input class="edit-my" value="${esc(p.name_my)}"></label><label>Class<input class="edit-class" value="${esc(p.class)}"></label></div>`).join('')}
async function commitKinds(kinds,success){
  captureDraft(kinds);
  if(sourceMode!=='live'){toast('Saved locally only. Export unpublished CSV and upload to GitHub manually.');render();return;}
  const saved=[];
  try{
    for(const kind of kinds){await publish(kind);saved.push(kind);clearDraftKinds([kind]);}
    banner('Live · Changes committed to GitHub');toast(success);render();
  }catch(err){
    // A failed response may follow a successful GitHub commit. Do NOT overwrite local edits.
    banner('Save not confirmed · Local CSV backup retained. Verify GitHub before retrying.');
    toast('Save unconfirmed: '+err.message+' · Export local backup.');render();
  }
}
async function saveScore(e){e.preventDefault();let m=game($('editMatch').value);if(!m)return;let s1=$('score1').value.trim(),s2=$('score2').value.trim(),status=$('editStatus').value;if(status==='completed'){if(!m.team1||!m.team2||s1===''||s2===''||!Number.isInteger(+s1)||!Number.isInteger(+s2)||+s1===+s2||+s1<0||+s2<0||Math.max(+s1,+s2)!==requiredWins(m)||Math.min(+s1,+s2)>=requiredWins(m)){toast('Completed series must have a winner with exactly ' + requiredWins(m) + ' game win(s), and the opponent must have fewer.');return}}if((s1!==''||s2!=='')&&(s1===''||s2===''||!Number.isInteger(+s1)||!Number.isInteger(+s2)||+s1<0||+s2<0)){toast('Enter two valid scores or leave both blank.');return}if(m.stage==='group'&&status==='completed'){const raw=Object.fromEntries(['kills1','kills2','deaths1','deaths2','duration_seconds'].map(k=>[k,$(k).value.trim()]));if(!Object.values(raw).every(v=>/^\d+$/.test(v))||+raw.duration_seconds<1){toast('Group results require both teams’ kills and deaths plus duration in seconds.');return}if(+raw.kills1!==+raw.deaths2||+raw.kills2!==+raw.deaths1){toast('For a 5v5 game, Team 1 kills must equal Team 2 deaths and vice versa. Check the scoreboard.');return}Object.assign(m,raw)}else if(m.stage==='group'&&status!=='completed'){for(const k of ['kills1','kills2','deaths1','deaths2','duration_seconds'])m[k]=''}Object.assign(m,{score1:s1,score2:s2,status,time:$('editTime').value.trim()});syncPlayoff();await commitKinds(['matches'],'Match result saved to GitHub.')}
async function saveRoster(){let t=team($('editTeam').value);let name=$('teamName').value.trim();if(!name){toast('Team name cannot be empty');return}t.team_name=name;document.querySelectorAll('.player-edit').forEach(row=>{let p=db.players.find(x=>x.player_id===row.dataset.player);p.name_en=row.querySelector('.edit-en').value.trim();p.name_my=row.querySelector('.edit-my').value.trim();p.class=row.querySelector('.edit-class').value.trim();p.review_status=p.name_en?'reviewed':'needs-clearer-photo'});await commitKinds(['teams','players'],'Roster and team saved to GitHub.')}
async function saveSeeds(){let records=[...document.querySelectorAll('.seed-select')].map(el=>({slot:el.dataset.slot,team_id:el.value}));let chosen=records.filter(x=>x.team_id);if(chosen.length!==0&&chosen.length!==8){toast('Select all eight manual seeds or none.');return}if(new Set(chosen.map(x=>x.team_id)).size!==chosen.length){toast('A team cannot occupy two playoff seeds.');return}db.seeds=records;syncPlayoff();await commitKinds(['seeds','matches'],'Playoff seeds saved to GitHub.')}
function download(name,body){let a=document.createElement('a'),url=URL.createObjectURL(new Blob([body],{type:'text/csv;charset=utf-8'}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function importCsv(){let kind=$('importType').value,file=$('importFile').files[0];if(!file){toast('Choose a CSV file first.');return}try{let rows=parseCSV(await file.text());if(!rows.length||!required[kind].every(k=>Object.prototype.hasOwnProperty.call(rows[0],k)))throw Error('CSV is missing required headers: '+required[kind].join(', '));if(kind==='teams'&&(rows.length!==15||new Set(rows.map(r=>r.team_id)).size!==15||rows.some(t=>!['A','B','C','D'].includes(t.group))))throw Error('Teams CSV requires 15 unique teams in groups A–D.');if(kind==='matches'&&(rows.length!==35||new Set(rows.map(r=>r.match_id)).size!==35||db.matches.some(m=>!rows.some(r=>r.match_id===m.match_id))))throw Error('Matches CSV must include all 35 match IDs.');if(kind==='players'&&rows.some(p=>!db.teams.some(t=>t.team_id===p.team_id)))throw Error('Players CSV contains unknown team IDs.');if(kind==='seeds'&&rows.some(s=>!['A1','A2','B1','B2','C1','C2','D1','D2'].includes(s.slot)))throw Error('Invalid seed slot.');db[kind]=rows;await commitKinds([kind],'Imported '+kind+' CSV to GitHub.')}catch(e){toast('Import failed: '+e.message)}}
function navigate(){let name=location.hash.slice(1)||'overview';if(!$(name)?.classList.contains('view'))name='overview';document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name));document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.dataset.view===name));$('navigation').classList.remove('open');window.scrollTo({top:0,behavior:'instant'})}
function bind(){window.addEventListener('hashchange',navigate);$('mobileMenu').onclick=()=>$('navigation').classList.toggle('open');$('stageFilter').onchange=renderFixtures;$('roomWave').onchange=renderRooms;$('statusFilter').onchange=renderFixtures;
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginError').textContent='';try{if(!online())throw Error('Configure the Worker URL in config.js.');let result=await api('/api/login',{method:'POST',body:JSON.stringify({username:$('username').value,password:$('password').value})});token=result.token;sessionStorage.setItem('uqec-mlbb-session',token);unlocked=true;$('loginBox').hidden=true;$('adminWorkspace').hidden=false;$('password').value='';if(!getDraft())await reloadLive();else {banner('Organizer access · Unpublished edits backed up locally; export before resync.');renderAdmin()} }catch(err){$('loginError').textContent=err.message;token='';sessionStorage.removeItem('uqec-mlbb-session')}};
$('logout').onclick=()=>{unlocked=false;token='';sessionStorage.removeItem('uqec-mlbb-session');$('loginBox').hidden=false;$('adminWorkspace').hidden=true};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('selected',x===b));document.querySelectorAll('.admin-tab').forEach(x=>x.hidden=x.id!==b.dataset.tab+'Tab')});$('editMatch').onchange=populateScore;$('scoreForm').onsubmit=saveScore;$('editTeam').onchange=populateRoster;$('saveRoster').onclick=saveRoster;$('saveSeeds').onclick=saveSeeds;
$('clearSeeds').onclick=async()=>{db.seeds=[];syncPlayoff();await commitKinds(['seeds','matches'],'Manual seeds removed from GitHub.')};
$('exportAll').onclick=()=>{for(const kind of Object.keys(required))download(kind+'.csv',toCSV(db[kind],required[kind]));toast('CSV backups downloaded.')};$('importButton').onclick=importCsv;
$('resetData').onclick=async()=>{if(getDraft()){toast('Export and resolve unpublished edits before reloading.');return}try{await load();render();toast('Latest available CSV loaded.')}catch(e){toast('Reload failed: '+e.message)}};
$('exportDraft').onclick=exportDraft;$('discardDraft').onclick=()=>{if(!confirm('Delete the unpublished local CSV backup? Export it first.'))return;localStorage.removeItem(DRAFT_KEY);pendingDraft=null;showRecovery();toast('Local backup discarded. Reload to obtain published data.')};showRecovery();$('resetResults').onclick=()=>resetRemote('results');$('resetAll').onclick=()=>resetRemote('all');
}
async function resetRemote(mode){if(!unlocked)return;if(sourceMode!=='live'||getDraft()){toast('Reset requires a live connection and no unpublished edits.');return;}if(!confirm(mode==='all'?'Reset ALL teams, players, fixtures and seeds to baseline CSV files on GitHub?':'Clear every match score and playoff seed while keeping teams and player rosters?'))return;if(!confirm('FINAL CONFIRMATION: This publishes a reset to GitHub. Have you exported your backup?'))return;try{let result=await api('/api/reset',{method:'POST',body:JSON.stringify({mode,shas:revisions})});await reloadLive();toast('Reset committed to GitHub ('+result.updated.join(', ')+').')}catch(err){toast('Reset error: '+err.message);await reloadLive().catch(()=>{})}}
(async function init(){bind();showRecovery();try{await load();render();navigate();if(token&&online()){unlocked=true;$('loginBox').hidden=true;$('adminWorkspace').hidden=false;renderAdmin();}if(online())setInterval(async()=>{if(document.hidden||unlocked||getDraft())return;try{await reloadLive()}catch(e){try{await loadPublishedCSV()}catch(f){banner('Data temporarily unavailable · '+f.message)}}},30000)}catch(err){console.error(err);banner('Data loading failed: '+err.message);toast('Unable to load published CSV: '+err.message)}})();
