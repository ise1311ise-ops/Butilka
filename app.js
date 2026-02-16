/* Neon Orbit — Telegram Mini App demo (no backend)
   - profiles generated locally
   - chat is simulated
   - state stored in localStorage
*/

const $ = (id) => document.getElementById(id);

const screens = {
  onboarding: $("screenOnboarding"),
  discover: $("screenDiscover"),
  match: $("screenMatch"),
  chat: $("screenChat"),
  settings: $("screenSettings"),
};

const stateKey = "neon_orbit_state_v1";

const defaultState = {
  me: null,
  energy: 10,
  theme: "neon",
  mode: "safe",
  currentProfile: null,
  currentMatch: null,
  chats: {}, // chatId -> messages [{from:"me"|"them", text, ts}]
  blocked: {}, // profileId -> true
};

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(stateKey);
    if(!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  }catch(e){
    return structuredClone(defaultState);
  }
}

function saveState(){
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function showScreen(name){
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function setTheme(theme){
  document.body.classList.remove("theme-mono","theme-sunset");
  if(theme === "mono") document.body.classList.add("theme-mono");
  if(theme === "sunset") document.body.classList.add("theme-sunset");
  state.theme = theme;
  saveState();
}

function nowTs(){ return Date.now(); }

function formatTime(ts){
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}

/* --- Telegram WebApp integration (optional) --- */
function tryTelegram(){
  const tg = window.Telegram?.WebApp;
  if(!tg) return null;
  try{
    tg.ready();
    tg.expand();
    return tg;
  }catch(_){
    return null;
  }
}
const tg = tryTelegram();

/* --- Fake profiles --- */
const avatars = ["★","✦","☾","☄","⚡","✶","✧","❖","✺","◎"];
const interests = ["музыка","спорт","кино","игры","путешествия","еды","мемы","сериалы","техно","книги"];
const vibes = ["спокойный вайб","дерзкий вайб","уютный вайб","ночной вайб","лайтовый вайб","смешной вайб"];
const goals = {
  chat: ["пообщаемся?","ищу собеседника","давай болтать"],
  dating: ["хочу знакомиться","ищу симпатию","давай на волну"],
  friends: ["ищу друзей","хочу компанию","новые знакомства"],
};

function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function rndInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function generateProfile(){
  const id = "p_" + Math.random().toString(16).slice(2);
  const age = rndInt(18, 34);
  const name = ["Nova","Orion","Luna","Vega","Mira","Sirius","Astra","Zen","Kira","Nox"][rndInt(0,9)] + "_" + rndInt(1,99);
  const tags = new Set([rnd(interests), rnd(interests), rnd(vibes)]);
  const goal = state?.me?.goal || "chat";
  const desc = `${rnd(goals[goal])}. ${rnd(["без токсика","с юмором","чуть стеснительно","на расслабоне","люблю честность","за взаимный вайб"])}.`;
  return { id, name, age, avatar: rnd(avatars), tags: [...tags], desc };
}

function nextProfile(){
  let p;
  let guard = 0;
  do{
    p = generateProfile();
    guard++;
  }while(state.blocked[p.id] && guard < 20);

  state.currentProfile = p;
  saveState();
  renderProfile(p);
}

function renderProfile(p){
  $("avatar").textContent = p.avatar;
  $("pname").textContent = p.name;
  $("pmeta").textContent = `${p.age} • сигнал рядом`;
  $("pdesc").textContent = p.desc;

  const tags = $("ptags");
  tags.innerHTML = "";
  p.tags.forEach(t=>{
    const el = document.createElement("div");
    el.className = "tagChip";
    el.textContent = `#${t}`;
    tags.appendChild(el);
  });
}

/* --- Safety filter (very simple) --- */
const badWords = ["суиц","убей","убиться","наркот","дети","несоверш"];
function safeText(text){
  if(state.mode !== "safe") return text;
  let t = text;
  badWords.forEach(w=>{
    const re = new RegExp(w, "ig");
    t = t.replace(re, "•".repeat(w.length));
  });
  return t;
}

/* --- Chat --- */
function chatIdFor(profileId){ return "c_" + profileId; }

function pushMsg(chatId, from, text){
  if(!state.chats[chatId]) state.chats[chatId] = [];
  state.chats[chatId].push({ from, text: safeText(text), ts: nowTs() });
  saveState();
}

function renderChat(chatId){
  const body = $("chatBody");
  body.innerHTML = "";

  const msgs = state.chats[chatId] || [];
  msgs.forEach(m=>{
    const b = document.createElement("div");
    b.className = "bubble " + (m.from === "me" ? "me" : "them");
    b.textContent = m.text;
    body.appendChild(b);

    const t = document.createElement("div");
    t.className = "muted small";
    t.style.margin = (m.from === "me") ? "0 0 6px auto" : "0 auto 6px 0";
    t.textContent = formatTime(m.ts);
    body.appendChild(t);
  });

  body.scrollTop = body.scrollHeight;
}

function simulatedReply(profile){
  const replies = [
    "О, привет 🙂 как вечер?",
    "Хаха, забавно 😄 чем занимаешься?",
    "Я тоже люблю такой вайб. Откуда ты?",
    "Давай коротко: музыка/кино/игры — что ближе?",
    "Я на связи. Только без токсика 🙂",
  ];
  const msg = rnd(replies);
  const chatId = chatIdFor(profile.id);

  // typing delay
  $("chatStatus").textContent = "печатает…";
  setTimeout(()=>{
    pushMsg(chatId, "them", msg);
    $("chatStatus").textContent = "в эфире";
    renderChat(chatId);
  }, rndInt(700, 1600));
}

/* --- Energy / like --- */
function setEnergy(v){
  state.energy = Math.max(0, Math.min(99, v));
  $("energy").textContent = `⚡ ${state.energy}`;
  saveState();
}

function helloLine(){
  const me = state.me;
  const nm = me?.name || "пилот";
  $("helloLine").textContent = `Привет, ${nm}. Цель: ${me?.goal || "общение"}.`;
}

/* --- UI actions --- */
$("btnStart").addEventListener("click", ()=>{
  const name = $("inName").value.trim() || "Pilot_" + rndInt(10,99);
  const age = parseInt($("inAge").value || "18", 10);
  const goal = $("inGoal").value;

  if(Number.isNaN(age) || age < 18){
    alert("Только 18+.");
    return;
  }

  // If Telegram provides user, you could override name, etc.
  // const tgUser = tg?.initDataUnsafe?.user;

  state.me = { name, age, goal };
  setEnergy(state.energy || 10);
  setTheme(state.theme || "neon");
  saveState();

  helloLine();
  showScreen("discover");
  nextProfile();
});

$("btnSkip").addEventListener("click", ()=>{
  nextProfile();
});

$("btnLike").addEventListener("click", ()=>{
  if(state.energy <= 0){
    alert("Энергия закончилась. (В реальном приложении тут реклама/покупка/ожидание)");
    return;
  }
  setEnergy(state.energy - 1);

  // Demo: 35% chance of match
  const p = state.currentProfile;
  const matched = Math.random() < 0.35;

  if(matched){
    state.currentMatch = p;
    saveState();

    $("mAvatar").textContent = p.avatar;
    $("mName").textContent = p.name;
    $("mMeta").textContent = `${p.age} • совпадение по сигналу`;
    showScreen("match");

    // create initial chat if empty
    const cid = chatIdFor(p.id);
    if(!state.chats[cid] || state.chats[cid].length === 0){
      pushMsg(cid, "them", "Хэй! Поймал(а) твой сигнал 🙂");
    }
  } else {
    nextProfile();
  }
});

$("btnBackToDiscover").addEventListener("click", ()=>{
  showScreen("discover");
  nextProfile();
});

$("btnOpenChat").addEventListener("click", ()=>{
  const p = state.currentMatch;
  if(!p) return;
  openChatWith(p);
});

function openChatWith(profile){
  state.currentMatch = profile;
  saveState();

  $("chatName").textContent = profile.name;
  $("chatStatus").textContent = "в эфире";
  showScreen("chat");

  const cid = chatIdFor(profile.id);
  renderChat(cid);

  // optional: auto reply
  setTimeout(()=> simulatedReply(profile), rndInt(300, 900));
}

$("btnSend").addEventListener("click", ()=>{
  const text = $("msg").value.trim();
  if(!text) return;
  const p = state.currentMatch;
  if(!p) return;

  const cid = chatIdFor(p.id);
  pushMsg(cid, "me", text);
  $("msg").value = "";
  renderChat(cid);

  // Simulated reply
  simulatedReply(p);
});

$("msg").addEventListener("keydown", (e)=>{
  if(e.key === "Enter") $("btnSend").click();
});

$("btnChatBack").addEventListener("click", ()=>{
  showScreen("discover");
  nextProfile();
});

$("btnBlock").addEventListener("click", ()=>{
  const p = state.currentMatch;
  if(!p) return;
  const ok = confirm("Заблокировать и удалить чат? (Демо)");
  if(!ok) return;

  state.blocked[p.id] = true;
  delete state.chats[chatIdFor(p.id)];
  state.currentMatch = null;
  saveState();
  showScreen("discover");
  nextProfile();
});

/* Settings */
$("btnSettings").addEventListener("click", ()=>{
  $("inTheme").value = state.theme || "neon";
  $("inMode").value = state.mode || "safe";
  showScreen("settings");
});

$("btnCloseSettings").addEventListener("click", ()=>{
  showScreen(state.me ? "discover" : "onboarding");
});

$("inTheme").addEventListener("change", (e)=> setTheme(e.target.value));
$("inMode").addEventListener("change", (e)=>{
  state.mode = e.target.value;
  saveState();
});

$("btnReset").addEventListener("click", ()=>{
  const ok = confirm("Сбросить демо-данные?");
  if(!ok) return;
  localStorage.removeItem(stateKey);
  state = loadState();
  setTheme(state.theme);
  showScreen("onboarding");
});

/* Boot */
(function init(){
  setTheme(state.theme || "neon");

  if(state.me){
    // restore
    $("inName").value = state.me.name || "";
    $("inAge").value = state.me.age || 18;
    $("inGoal").value = state.me.goal || "chat";

    helloLine();
    showScreen("discover");
    setEnergy(state.energy ?? 10);

    if(state.currentProfile){
      renderProfile(state.currentProfile);
    } else {
      nextProfile();
    }
  } else {
    showScreen("onboarding");
  }
})();
