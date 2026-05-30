import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   STORAGE  (shared = real online leaderboard)
───────────────────────────────────────────────────────────────────────────── */
const K = { lb:"gc_lb_v4", chat:"gc_chat_v4", online:"gc_online_v4" };

async function sGet(key, shared=true) {
  try { const r = await window.storage.get(key,shared); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function sSet(key, val, shared=true) {
  try { await window.storage.set(key, JSON.stringify(val), shared); } catch {}
}

/* ─────────────────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────────────────── */
function uid()  { return Math.random().toString(36).slice(2,10); }
function fmt(n) { if(n>=1e6) return (n/1e6).toFixed(1)+"M"; if(n>=1e3) return (n/1e3).toFixed(1)+"K"; return String(n); }
function today(){ return new Date().toDateString(); }

const DAILY = [
  {day:1,coins:200,label:"День 1",icon:"🎁"},
  {day:2,coins:350,label:"День 2",icon:"💰"},
  {day:3,coins:600,label:"День 3",icon:"⭐"},
  {day:4,coins:900,label:"День 4",icon:"🔥"},
  {day:5,coins:1400,label:"День 5",icon:"💎"},
  {day:6,coins:2000,label:"День 6",icon:"👑"},
  {day:7,coins:5000,label:"День 7",icon:"🏆",special:true},
];

/* ─────────────────────────────────────────────────────────────────────────────
   SLOT CONFIG
───────────────────────────────────────────────────────────────────────────── */
const SYM   = ["🍒","🍋","🍊","🍇","⭐","7️⃣","💎"];
const SW    = [30,25,20,12,8,3,2];
const SPAY  = {"💎💎💎":50,"7️⃣7️⃣7️⃣":20,"🍇🍇🍇":10,"🍒🍒🍒":8,"⭐⭐⭐":6};
function wRand(){ const t=SW.reduce((a,b)=>a+b,0); let r=Math.random()*t; for(let i=0;i<SYM.length;i++){r-=SW[i];if(r<=0)return SYM[i];} return SYM[0]; }

const RED_N = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const DICE_F = ["⚀","⚁","⚂","⚃","⚄","⚅"];

/* ─────────────────────────────────────────────────────────────────────────────
   BLACKJACK HELPERS
───────────────────────────────────────────────────────────────────────────── */
const DECK_S = ["♠","♥","♦","♣"];
const DECK_V = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
function newDeck() {
  const d=[];
  DECK_S.forEach(s=>DECK_V.forEach(v=>d.push({s,v})));
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}
function cardVal(v){ if(["J","Q","K"].includes(v)) return 10; if(v==="A") return 11; return parseInt(v); }
function handScore(hand){
  let s=hand.reduce((a,c)=>a+cardVal(c.v),0);
  let aces=hand.filter(c=>c.v==="A").length;
  while(s>21&&aces>0){s-=10;aces--;}
  return s;
}
function cardColor(s){ return s==="♥"||s==="♦" ? "#e05555" : "#1a1a2e"; }

/* ─────────────────────────────────────────────────────────────────────────────
   MINES CONFIG
───────────────────────────────────────────────────────────────────────────── */
function buildMinesGrid(mineCount=5){
  const cells=Array(25).fill(false);
  let placed=0;
  while(placed<mineCount){const i=Math.floor(Math.random()*25);if(!cells[i]){cells[i]=true;placed++;}}
  return cells;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');

*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;overflow:hidden;}
body{font-family:'DM Sans',sans-serif;background:#0f1117;color:#f0f0f0;}

::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px}

/* ── Liquid Glass ── */
.glass{
  background:rgba(255,255,255,.06);
  backdrop-filter:blur(20px) saturate(180%);
  -webkit-backdrop-filter:blur(20px) saturate(180%);
  border:1px solid rgba(255,255,255,.1);
  border-top-color:rgba(255,255,255,.18);
  border-left-color:rgba(255,255,255,.14);
}
.glass-dark{
  background:rgba(0,0,0,.35);
  backdrop-filter:blur(24px) saturate(160%);
  -webkit-backdrop-filter:blur(24px) saturate(160%);
  border:1px solid rgba(255,255,255,.08);
  border-top-color:rgba(255,255,255,.13);
}
.glass-btn{
  background:rgba(255,255,255,.1);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.15);
  border-top-color:rgba(255,255,255,.25);
  transition:all .18s ease;
}
.glass-btn:active{background:rgba(255,255,255,.18);transform:scale(.97);}

/* ── Typography ── */
.display{font-family:'DM Serif Display',serif;letter-spacing:-.02em;}
.mono{font-family:'DM Sans',monospace;font-variant-numeric:tabular-nums;}

/* ── Background ── */
.bg-gradient{
  background:
    radial-gradient(ellipse 80% 60% at 20% -10%, rgba(120,80,255,.18) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 100%, rgba(30,120,255,.14) 0%, transparent 55%),
    radial-gradient(ellipse 100% 80% at 50% 50%, rgba(0,0,0,0) 0%, #0f1117 100%),
    #0f1117;
  min-height:100vh;
}

/* ── Cards ── */
.game-card{
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.09);
  border-top-color:rgba(255,255,255,.15);
  border-radius:20px;
  cursor:pointer;
  transition:transform .18s ease, background .18s ease, box-shadow .18s ease;
  overflow:hidden;
  position:relative;
}
.game-card:active{transform:scale(.97);}
.game-card:hover{background:rgba(255,255,255,.08);box-shadow:0 8px 32px rgba(0,0,0,.3);}

/* ── Pill / Badge ── */
.pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:4px 11px;border-radius:100px;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
  font-size:12px;font-weight:500;
}

/* ── Input ── */
.glass-input{
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.12);
  border-radius:12px;
  color:#f0f0f0;
  padding:10px 14px;
  font-family:'DM Sans',sans-serif;
  font-size:14px;
  outline:none;
  width:100%;
  transition:border-color .18s;
}
.glass-input:focus{border-color:rgba(255,255,255,.3);}
.glass-input::placeholder{color:rgba(255,255,255,.3);}

/* ── Animations ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes slideRight{from{width:0}to{width:100%}}
@keyframes crashLine{from{height:0}to{height:var(--h)}}
@keyframes flipCard{0%{transform:rotateY(0)}50%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}

.anim-fade-up{animation:fadeUp .28s ease both;}
.anim-scale{animation:scaleIn .28s cubic-bezier(.34,1.4,.64,1) both;}

/* ── Progress bar ── */
.xp-bar{height:3px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;}
.xp-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,rgba(255,255,255,.5),rgba(255,255,255,.9));transition:width .6s ease;}

/* ── Bet chip ── */
.chip{
  min-width:46px;padding:6px 4px;border-radius:10px;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
  font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;
  text-align:center;color:rgba(255,255,255,.7);
}
.chip.active{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35);color:#fff;}

/* ── Bottom nav ── */
.nav-item{
  flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:3px;background:none;border:none;
  cursor:pointer;color:rgba(255,255,255,.35);
  font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;
  transition:color .18s;padding:8px 0;
}
.nav-item.active{color:#fff;}
.nav-icon{font-size:21px;transition:transform .18s;}
.nav-item.active .nav-icon{transform:scale(1.15);}

/* ── Mine cell ── */
.mine-cell{
  aspect-ratio:1;border-radius:12px;
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.1);
  display:flex;align-items:center;justify-content:center;
  font-size:22px;cursor:pointer;
  transition:all .15s;
}
.mine-cell:active{transform:scale(.93);}
.mine-cell.revealed-safe{background:rgba(80,200,100,.15);border-color:rgba(80,200,100,.3);}
.mine-cell.revealed-mine{background:rgba(220,60,60,.2);border-color:rgba(220,60,60,.4);}

/* ── BJ Card ── */
.bj-card{
  width:38px;height:54px;border-radius:7px;
  background:#fff;
  border:1px solid rgba(0,0,0,.15);
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  font-size:11px;font-weight:700;line-height:1.1;
  box-shadow:0 2px 8px rgba(0,0,0,.3);
  flex-shrink:0;
}
.bj-card-back{
  width:38px;height:54px;border-radius:7px;
  background:linear-gradient(135deg,#1a1a3e 25%,#2a2a5e 50%,#1a1a3e 75%);
  border:2px solid rgba(255,255,255,.1);
  box-shadow:0 2px 8px rgba(0,0,0,.3);
  flex-shrink:0;
}

/* ── Crash chart ── */
.crash-multiplier{
  font-family:'DM Serif Display',serif;
  font-size:52px;
  line-height:1;
  text-align:center;
  transition:color .3s;
}

/* ── Roulette ── */
.rou-bet-opt{
  padding:10px 6px;border-radius:12px;cursor:pointer;
  font-size:12px;font-weight:600;text-align:center;
  transition:all .15s;border:1px solid transparent;
}

/* ── Toast ── */
.toast{
  position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
  padding:10px 20px;border-radius:100px;
  font-size:13px;font-weight:600;
  pointer-events:none;z-index:500;
  animation:scaleIn .25s cubic-bezier(.34,1.4,.64,1) both;
  white-space:nowrap;
}

/* ── Win modal ── */
.win-modal{
  position:fixed;inset:0;
  display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.7);
  backdrop-filter:blur(8px);
  z-index:600;
}
.win-box{
  border-radius:28px;padding:36px 32px;text-align:center;
  width:300px;
  animation:scaleIn .3s cubic-bezier(.34,1.4,.64,1) both;
}

/* ── Online dot ── */
.online-dot{
  width:7px;height:7px;border-radius:50%;
  background:#4ade80;
  animation:pulse 2s ease-in-out infinite;
  display:inline-block;
}

/* ── Streak day ── */
.streak-day{
  border-radius:12px;padding:8px 4px;text-align:center;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.04);
  flex:1;
}
.streak-day.done{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.1);}
.streak-day.today{border-color:rgba(255,200,50,.5);background:rgba(255,200,50,.1);}

/* ── Lb rank ── */
.lb-rank-1{color:#FFD700;}
.lb-rank-2{color:#C0C0C0;}
.lb-rank-3{color:#CD7F32;}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   DEFAULT PLAYER
───────────────────────────────────────────────────────────────────────────── */
function defaultPlayer() {
  return {
    id: uid(), name:"Игрок_"+Math.floor(Math.random()*9999),
    balance:5000, wins:0, games:0, bestWin:0,
    xp:0, level:1,
    dailyStreak:0, lastDaily:"", lastLogin:"",
    inventory:[], equippedAv:null,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [pl, setPl] = useState(() => {
    try{ const s=localStorage.getItem("gcp_v4"); if(s) return JSON.parse(s); }catch{}
    return defaultPlayer();
  });
  const [tab, setTab]       = useState("lobby");   // lobby | leaderboard | shop | profile
  const [game, setGame]     = useState(null);       // slots|roulette|dice|coinflip|blackjack|mines|crash|wheel
  const [bet, setBet]       = useState(100);
  const [toast, setToast]   = useState(null);
  const [winModal, setWinModal] = useState(null);
  const [showDaily, setShowDaily] = useState(false);
  const [lb, setLb]         = useState([]);
  const [online, setOnline] = useState(1);
  const [lbMode, setLbMode] = useState("coins");
  const [shopCat, setShopCat] = useState("avatars");
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // game states
  const [reels, setReels]     = useState(["🍒","🍋","🍊"]);
  const [rSpin, setRSpin]     = useState([false,false,false]);
  const [slotsMsg, setSlotsMsg] = useState({t:"Нажми SPIN",w:null});
  const [rouChoice, setRouChoice] = useState(null);
  const [rouResult, setRouResult] = useState(null);
  const [rouDeg, setRouDeg]   = useState(0);
  const [rouSpin, setRouSpin] = useState(false);
  const [dChoice, setDChoice] = useState(null);
  const [dVals, setDVals]     = useState([1,1]);
  const [dRoll, setDRoll]     = useState(false);
  const [dMsg, setDMsg]       = useState(null);
  const [cChoice, setCChoice] = useState(null);
  const [cSide, setCSide]     = useState("H");
  const [cFlip, setCFlip]     = useState(false);
  const [cMsg, setCMsg]       = useState(null);
  // blackjack
  const [bjDeck, setBjDeck]   = useState([]);
  const [bjPlayer, setBjPlayer] = useState([]);
  const [bjDealer, setBjDealer] = useState([]);
  const [bjPhase, setBjPhase] = useState("idle"); // idle|playing|dealer|done
  const [bjMsg, setBjMsg]     = useState("");
  // mines
  const [mGrid, setMGrid]     = useState(null);
  const [mRevealed, setMRevealed] = useState([]);
  const [mPhase, setMPhase]   = useState("idle"); // idle|playing|done
  const [mMult, setMMult]     = useState(1);
  const [mMines, setMMines]   = useState(5);
  // crash
  const [crMult, setCrMult]   = useState(1.00);
  const [crPhase, setCrPhase] = useState("idle"); // idle|running|crashed|cashedout
  const [crCashedAt, setCrCashedAt] = useState(null);
  const crIntervalRef = useRef(null);
  // wheel
  const [wSpin, setWSpin]     = useState(false);
  const [wDeg, setWDeg]       = useState(0);
  const [wResult, setWResult] = useState(null);

  const [busy, setBusy] = useState(false);
  const toastRef = useRef(null);

  // ── persist ──
  useEffect(()=>{ localStorage.setItem("gcp_v4",JSON.stringify(pl)); },[pl]);

  // ── init ──
  useEffect(()=>{
    syncOnline(); loadLb();
    const t=today();
    if(pl.lastLogin!==t){ setPl(p=>({...p,lastLogin:t})); setTimeout(()=>setShowDaily(true),600); }
    const iv=setInterval(()=>{ syncOnline(); loadLb(); },9000);
    return()=>clearInterval(iv);
  },[]);

  function upd(fn){ setPl(p=>{const n=fn(p);return n;}); }

  // ── online ──
  async function syncOnline(){
    const now=Date.now();
    const all=(await sGet(K.online))||{};
    all[pl.id]={name:pl.name,ts:now};
    Object.keys(all).forEach(k=>{ if(now-all[k].ts>35000) delete all[k]; });
    await sSet(K.online,all);
    setOnline(Object.keys(all).length);
  }

  // ── leaderboard ──
  async function loadLb(){
    const data=(await sGet(K.lb))||[];
    const me={id:pl.id,name:pl.name,coins:pl.balance,wins:pl.wins,level:pl.level,games:pl.games};
    const idx=data.findIndex(e=>e.id===pl.id);
    if(idx>=0) data[idx]=me; else data.push(me);
    data.sort((a,b)=>b.coins-a.coins);
    const top=data.slice(0,100);
    await sSet(K.lb,top);
    setLb(top);
  }

  // ── toast ──
  function toast_(msg,type="neutral"){
    setToast({msg,type});
    clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(null),2400);
  }

  // ── XP / level ──
  function gainXP(amount){
    upd(p=>{
      const nx=p.xp+amount;
      const nl=Math.floor(nx/500)+1;
      if(nl>p.level) toast_(`⬆️ Уровень ${nl}!`,"up");
      return{...p,xp:nx,level:nl};
    });
  }

  // ── win / lose ──
  function doWin(amount,showModal=false,emoji="🏆",title="ВЫИГРЫШ!"){
    upd(p=>({...p,balance:p.balance+amount,wins:p.wins+1,bestWin:Math.max(p.bestWin,amount)}));
    gainXP(Math.ceil(amount/40));
    if(showModal) setWinModal({emoji,title,amount});
    else toast_(`+${fmt(amount)} монет`,"win");
  }
  function doLose(){
    upd(p=>({...p,games:p.games+1}));
    toast_(`-${fmt(bet)} монет`,"lose");
  }
  function spendBet(){ upd(p=>({...p,balance:p.balance-bet,games:p.games+1})); }

  // ── daily ──
  function claimDaily(){
    const t=today();
    if(pl.lastDaily===t) return;
    const yest=new Date(); yest.setDate(yest.getDate()-1);
    const streak=pl.lastDaily===yest.toDateString()?Math.min((pl.dailyStreak||0)+1,7):1;
    const reward=DAILY[(streak-1)%7];
    upd(p=>({...p,balance:p.balance+reward.coins,lastDaily:t,dailyStreak:streak}));
    setShowDaily(false);
    setWinModal({emoji:reward.icon,title:`День ${streak}! Серия!`,amount:reward.coins});
  }

  // ─── SLOTS ───────────────────────────────────────────────────────────────────
  function spinSlots(){
    if(busy||pl.balance<bet){if(pl.balance<bet)toast_("Недостаточно монет","lose");return;}
    setBusy(true); spendBet();
    setRSpin([true,true,true]); setSlotsMsg({t:"...",w:null});
    const res=[wRand(),wRand(),wRand()];
    setTimeout(()=>{
      [0,1,2].forEach((i)=>setTimeout(()=>{
        setReels(p=>{const n=[...p];n[i]=res[i];return n;});
        setRSpin(p=>{const n=[...p];n[i]=false;return n;});
      },i*200));
      setTimeout(()=>{
        const key=res.join("");
        const all3=res[0]===res[1]&&res[1]===res[2];
        const two=res[0]===res[1]||res[1]===res[2]||res[0]===res[2];
        let mult=0;
        if(all3) mult=SPAY[key]||4;
        else if(two) mult=1.5;
        if(mult>0){
          const w=Math.floor(bet*mult);
          doWin(w,mult>=8,"🎰",`×${mult} ДЖЕКПОТ!`);
          setSlotsMsg({t:`+${fmt(w)} монет`,w:true});
        } else { doLose(); setSlotsMsg({t:"Нет совпадений",w:false}); }
        setBusy(false);
      },750);
    },1200);
  }

  // ─── ROULETTE ────────────────────────────────────────────────────────────────
  function spinRou(){
    if(busy||!rouChoice){if(!rouChoice)toast_("Выбери ставку","neutral");return;}
    if(pl.balance<bet){toast_("Недостаточно монет","lose");return;}
    setBusy(true); spendBet(); setRouSpin(true); setRouResult(null);
    const num=Math.floor(Math.random()*37);
    setRouDeg(d=>d+1440+num*9.73);
    setTimeout(()=>{
      setRouSpin(false);
      const col=num===0?"green":RED_N.includes(num)?"red":"black";
      setRouResult({num,col});
      let win=0;
      if(rouChoice==="red"&&col==="red") win=bet*2;
      else if(rouChoice==="black"&&col==="black") win=bet*2;
      else if(rouChoice==="green"&&col==="green") win=bet*14;
      else if(rouChoice==="odd"&&num>0&&num%2!==0) win=bet*2;
      else if(rouChoice==="even"&&num>0&&num%2===0) win=bet*2;
      else if(rouChoice==="hi"&&num>=19) win=bet*2;
      if(win>0) doWin(win,rouChoice==="green","🎡","ЗЕРО! ВЫИГРЫШ!");
      else doLose();
      setBusy(false);
    },3600);
  }

  // ─── DICE ─────────────────────────────────────────────────────────────────────
  function rollDice(){
    if(busy||!dChoice){if(!dChoice)toast_("Выбери выше/ниже","neutral");return;}
    if(pl.balance<bet){toast_("Недостаточно монет","lose");return;}
    setBusy(true); spendBet(); setDRoll(true); setDMsg(null);
    const r1=Math.ceil(Math.random()*6),r2=Math.ceil(Math.random()*6);
    setTimeout(()=>{
      setDVals([r1,r2]); setDRoll(false);
      const won=(dChoice==="hi"&&r1>=4)||(dChoice==="lo"&&r1<=3);
      if(won){const w=Math.floor(bet*1.9);doWin(w);setDMsg({w:true,t:`+${fmt(w)}`});}
      else{doLose();setDMsg({w:false,t:"Проигрыш"});}
      setBusy(false);
    },950);
  }

  // ─── COINFLIP ─────────────────────────────────────────────────────────────────
  function flipCoin(){
    if(busy||!cChoice){if(!cChoice)toast_("Выбери сторону","neutral");return;}
    if(pl.balance<bet){toast_("Недостаточно монет","lose");return;}
    setBusy(true); spendBet(); setCFlip(true); setCMsg(null);
    const res=Math.random()<.5?"H":"T";
    setTimeout(()=>{
      setCSide(res); setCFlip(false);
      if(res===cChoice){const w=Math.floor(bet*1.95);doWin(w);setCMsg({w:true,t:`+${fmt(w)}`});}
      else{doLose();setCMsg({w:false,t:"Проигрыш"});}
      setBusy(false);
    },1100);
  }

  // ─── BLACKJACK ────────────────────────────────────────────────────────────────
  function bjDeal(){
    if(pl.balance<bet){toast_("Недостаточно монет","lose");return;}
    spendBet();
    const deck=newDeck();
    const p=[deck[0],deck[2]],d=[deck[1],deck[3]];
    setBjDeck(deck.slice(4)); setBjPlayer(p); setBjDealer(d); setBjMsg(""); setBjPhase("playing");
    if(handScore(p)===21){ setBjMsg("Блэкджек! 🃏"); bjFinish(p,d,deck.slice(4),true); }
  }
  function bjHit(){
    const deck=[...bjDeck]; const card=deck.shift(); setBjDeck(deck);
    const np=[...bjPlayer,card]; setBjPlayer(np);
    if(handScore(np)>21){ setBjMsg("Перебор 💥"); setBjPhase("done");
      upd(p=>({...p,games:p.games+1})); toast_(`-${fmt(bet)}`,"lose");
    }
  }
  function bjStand(){ setBjPhase("dealer"); bjPlayDealer(bjDealer,[...bjDeck],bjPlayer); }
  function bjPlayDealer(dHand,deck,pHand){
    let d=[...dHand],dk=[...deck];
    while(handScore(d)<17){ const c=dk.shift(); d.push(c); dk=dk; }
    setBjDealer(d); setBjDeck(dk);
    setTimeout(()=>bjFinish(pHand,d,dk,false),[600]);
  }
  function bjFinish(pHand,dHand,deck,bj){
    const ps=handScore(pHand),ds=handScore(dHand);
    setBjPhase("done");
    if(bj||ps===21||(ps<=21&&(ds>21||ps>ds))){
      const mult=bj?2.5:2; const w=Math.floor(bet*mult);
      doWin(w,false); setBjMsg(bj?`Блэкджек! +${fmt(w)}`:`Победа! +${fmt(w)}`);
    } else if(ps===ds){ upd(p=>({...p,balance:p.balance+bet})); setBjMsg("Ничья — возврат"); }
    else{ doLose(); setBjMsg(`Дилер победил (${ds} vs ${ps})`); }
  }
  function bjReset(){ setBjPhase("idle"); setBjPlayer([]); setBjDealer([]); setBjMsg(""); }

  // ─── MINES ────────────────────────────────────────────────────────────────────
  function mStart(){
    if(pl.balance<bet){toast_("Недостаточно монет","lose");return;}
    spendBet();
    setMGrid(buildMinesGrid(mMines)); setMRevealed(Array(25).fill(null));
    setMPhase("playing"); setMMult(1);
  }
  function mReveal(i){
    if(mPhase!=="playing"||mRevealed[i]!==null) return;
    const nr=[...mRevealed]; nr[i]=mGrid[i]?"mine":"safe";
    setMRevealed(nr);
    if(mGrid[i]){
      setMPhase("done"); toast_(`-${fmt(bet)}`,"lose"); doLose();
      // reveal all mines
      const full=mGrid.map((m,idx)=>m?"mine":(nr[idx]||null));
      setMRevealed(full);
    } else {
      const safeRevealed=nr.filter(x=>x==="safe").length;
      const newMult=parseFloat((1+safeRevealed*0.3*(mMines/5)).toFixed(2));
      setMMult(newMult);
    }
  }
  function mCashout(){
    if(mPhase!=="playing") return;
    const w=Math.floor(bet*mMult);
    doWin(w,mMult>=3,"💣","КЭШАУТ!");
    setMPhase("done");
  }

  // ─── CRASH ────────────────────────────────────────────────────────────────────
  function crStart(){
    if(pl.balance<bet){toast_("Недостаточно монет","lose");return;}
    spendBet(); setCrPhase("running"); setCrMult(1.00); setCrCashedAt(null);
    const crashAt=parseFloat((1+Math.random()*Math.random()*9).toFixed(2));
    let cur=1.00;
    crIntervalRef.current=setInterval(()=>{
      cur=parseFloat((cur+0.03+cur*0.008).toFixed(2));
      setCrMult(cur);
      if(cur>=crashAt){
        clearInterval(crIntervalRef.current);
        setCrPhase("crashed");
        doLose();
      }
    },120);
  }
  function crCashout(){
    if(crPhase!=="running") return;
    clearInterval(crIntervalRef.current);
    setCrCashedAt(crMult); setCrPhase("cashedout");
    const w=Math.floor(bet*crMult);
    doWin(w,crMult>=3,"🚀",`×${crMult} КЭШАУТ!`);
  }
  useEffect(()=>()=>clearInterval(crIntervalRef.current),[]);

  // ─── WHEEL ────────────────────────────────────────────────────────────────────
  const WHEEL_SEGS=[
    {label:"×2",mult:2,color:"#3b82f6",chance:25},
    {label:"×0",mult:0,color:"#ef4444",chance:35},
    {label:"×3",mult:3,color:"#8b5cf6",chance:18},
    {label:"×0",mult:0,color:"#ef4444",chance:10},
    {label:"×5",mult:5,color:"#f59e0b",chance:7},
    {label:"×1.5",mult:1.5,color:"#10b981",chance:4},
    {label:"×10",mult:10,color:"#f97316",chance:1},
  ];
  function spinWheel(){
    if(busy||pl.balance<bet){if(pl.balance<bet)toast_("Недостаточно монет","lose");return;}
    setBusy(true); spendBet(); setWSpin(true); setWResult(null);
    // weighted random
    const total=WHEEL_SEGS.reduce((a,s)=>a+s.chance,0);
    let r=Math.random()*total;
    let segIdx=0;
    for(let i=0;i<WHEEL_SEGS.length;i++){r-=WHEEL_SEGS[i].chance;if(r<=0){segIdx=i;break;}}
    const segAngle=360/WHEEL_SEGS.length;
    const targetAngle=segIdx*segAngle+segAngle/2;
    const newDeg=wDeg+1440+(360-targetAngle);
    setWDeg(newDeg);
    setTimeout(()=>{
      setWSpin(false); const seg=WHEEL_SEGS[segIdx];
      setWResult(seg);
      if(seg.mult>0){const w=Math.floor(bet*seg.mult);doWin(w,seg.mult>=5,"🎡",`×${seg.mult}!`);}
      else{doLose();}
      setBusy(false);
    },4000);
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     SHOP DATA
  ───────────────────────────────────────────────────────────────────────────── */
  const AVATARS_SHOP=[
    {id:"av0",icon:"🐺",name:"Волк",price:0},
    {id:"av1",icon:"🦊",name:"Лиса",price:500},
    {id:"av2",icon:"🐉",name:"Дракон",price:1500},
    {id:"av3",icon:"👑",name:"Корона",price:3000},
    {id:"av4",icon:"🦁",name:"Лев",price:1000},
    {id:"av5",icon:"🦅",name:"Орёл",price:800},
    {id:"av6",icon:"🐯",name:"Тигр",price:1200},
    {id:"av7",icon:"🌙",name:"Луна",price:2500},
  ];
  const TITLES_SHOP=[
    {id:"t0",name:"Новичок",price:0},
    {id:"t1",name:"Игрок",price:500},
    {id:"t2",name:"Профи",price:2000},
    {id:"t3",name:"Акула",price:5000},
    {id:"t4",name:"Легенда",price:12000},
  ];
  const BOOST_SHOP=[
    {id:"b_double",icon:"⚡",name:"Double Up",desc:"Следующий выигрыш ×2",price:300},
    {id:"b_lucky",icon:"🍀",name:"Lucky Spin",desc:"Гарант. выигрыш в слотах",price:800},
    {id:"b_shield",icon:"🛡️",name:"Щит",desc:"Защита от проигрыша",price:500},
  ];

  function buyShop(item, category){
    const owned=(pl.inventory||[]).includes(item.id);
    if(owned){
      if(category==="avatars") upd(p=>({...p,equippedAv:item.icon}));
      else if(category==="titles") upd(p=>({...p,equippedTitle:item.name}));
      else if(category==="boosts"){
        upd(p=>({...p,activeBooster:item.id,inventory:p.inventory.filter(x=>x!==item.id)}));
      }
      toast_("Активировано!","up");
      return;
    }
    if(pl.balance<item.price){toast_("Недостаточно монет","lose");return;}
    upd(p=>({...p,balance:p.balance-item.price,inventory:[...(p.inventory||[]),item.id]}));
    toast_(`Куплено: ${item.name||item.icon}`,"win");
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     SAVE NAME
  ───────────────────────────────────────────────────────────────────────────── */
  function saveName(){
    if(nameInput.trim().length<2){toast_("Минимум 2 символа","lose");return;}
    upd(p=>({...p,name:nameInput.trim().slice(0,20)}));
    setEditName(false); toast_("Ник изменён!","up");
    setTimeout(loadLb,300);
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     HELPERS UI
  ───────────────────────────────────────────────────────────────────────────── */
  const xpPct=Math.min(100,(pl.xp%500)/500*100);
  const curPage=game||tab;

  function BigBtn({onClick,children,disabled,style={}}){
    return(
      <button onClick={onClick} disabled={disabled} className="glass-btn" style={{
        width:"100%",padding:"14px 0",borderRadius:14,cursor:disabled?"not-allowed":"pointer",
        color:disabled?"rgba(255,255,255,.3)":"#fff",fontFamily:"'DM Sans',sans-serif",
        fontWeight:700,fontSize:15,letterSpacing:.3,...style
      }}>{children}</button>
    );
  }

  function BetRow(){
    return(
      <div className="glass" style={{borderRadius:14,padding:12,marginBottom:10}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Ставка</div>
        <div style={{display:"flex",gap:6}}>
          {[50,100,250,500,1000].map(v=>(
            <button key={v} className={`chip${bet===v?" active":""}`} onClick={()=>setBet(v)}>
              {v>=1000?"1К":v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function BackBtn(){
    return(
      <button className="glass-btn" onClick={()=>{setGame(null);setBusy(false);}} style={{
        background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",
        borderRadius:10,color:"#fff",padding:"7px 14px",fontSize:16,cursor:"pointer",marginRight:10,
      }}>←</button>
    );
  }

  function GameHeader({title}){
    return(
      <div style={{display:"flex",alignItems:"center",padding:"0 16px 14px"}}>
        <BackBtn/>
        <span style={{fontFamily:"'DM Serif Display',serif",fontSize:20}}>{title}</span>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────────── */
  return(
    <div className="bg-gradient" style={{height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{CSS}</style>

      {/* TOP BAR */}
      <div className="glass-dark" style={{padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,borderRadius:0,borderLeft:"none",borderRight:"none",borderTop:"none"}}>
        <div className="display" style={{fontSize:18,letterSpacing:"-.01em"}}>Grand Casino</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"rgba(255,255,255,.5)"}}>
            <span className="online-dot"/>
            {online}
          </div>
          <div className="glass pill" style={{fontWeight:700,fontSize:14,color:"#fff"}}>
            🪙 {fmt(pl.balance)}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:72}}>

        {/* ═══════════════════ LOBBY ═══════════════════ */}
        {curPage==="lobby"&&(
          <div className="anim-fade-up" style={{padding:"14px 16px 0"}}>

            {/* Player card */}
            <div className="glass" style={{borderRadius:20,padding:16,marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,border:"1px solid rgba(255,255,255,.12)"}}>
                {pl.equippedAv||"🐺"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:16,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pl.name}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginBottom:6}}>{pl.equippedTitle||"Новичок"} · Ур. {pl.level}</div>
                <div className="xp-bar"><div className="xp-fill" style={{width:xpPct+"%"}}/></div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700}}>🔥 {pl.dailyStreak||0}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>серия</div>
              </div>
            </div>

            {/* Stats */}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[["🏅",pl.wins,"Победы"],["🎮",pl.games,"Игры"],["💰",fmt(pl.bestWin),"Рекорд"]].map(([e,v,l])=>(
                <div key={l} className="glass" style={{flex:1,borderRadius:14,padding:"10px 8px",textAlign:"center"}}>
                  <div style={{fontSize:16,marginBottom:3}}>{e}</div>
                  <div style={{fontWeight:700,fontSize:16}}>{v}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:1}}>{l}</div>
                </div>
              ))}
            </div>

            {/* Daily banner */}
            <div onClick={()=>setShowDaily(true)} className="glass" style={{borderRadius:16,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:pl.lastDaily===today()?"rgba(255,255,255,.04)":"rgba(255,200,50,.07)",borderColor:pl.lastDaily===today()?"rgba(255,255,255,.09)":"rgba(255,200,50,.25)"}}>
              <div style={{fontSize:28}}>🎁</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Ежедневная награда</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>
                  {pl.lastDaily===today()?`Серия: ${pl.dailyStreak} дней`:"Доступна сегодня!"}
                </div>
              </div>
              <div className={pl.lastDaily===today()?"glass":"glass-btn"} style={{padding:"7px 14px",borderRadius:10,fontSize:13,fontWeight:600,color:pl.lastDaily===today()?"rgba(255,255,255,.3)":"#fff",whiteSpace:"nowrap",border:"1px solid rgba(255,255,255,.12)"}}>
                {pl.lastDaily===today()?"Готово":"Забрать"}
              </div>
            </div>

            {/* Games */}
            <div style={{fontSize:12,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Игры</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[
                {id:"slots",    icon:"🎰",label:"Слоты",     sub:"До ×50",   accent:"rgba(251,191,36,.12)"},
                {id:"roulette", icon:"🎡",label:"Рулетка",   sub:"×2 — ×14", accent:"rgba(59,130,246,.12)"},
                {id:"blackjack",icon:"🃏",label:"Блэкджек",  sub:"×2.5",     accent:"rgba(139,92,246,.12)"},
                {id:"crash",    icon:"🚀",label:"Краш",      sub:"×∞",       accent:"rgba(239,68,68,.12)"},
                {id:"mines",    icon:"💣",label:"Мины",      sub:"×0.3 за шаг",accent:"rgba(16,185,129,.12)"},
                {id:"wheel",    icon:"🎡",label:"Колесо",    sub:"До ×10",   accent:"rgba(245,158,11,.12)"},
                {id:"dice",     icon:"🎲",label:"Кости",     sub:"×1.9",     accent:"rgba(99,102,241,.12)"},
                {id:"coinflip", icon:"🪙",label:"Монетка",   sub:"×1.95",    accent:"rgba(20,184,166,.12)"},
              ].map(g=>(
                <div key={g.id} className="game-card" onClick={()=>setGame(g.id)} style={{padding:"18px 14px",background:g.accent,borderColor:"rgba(255,255,255,.08)"}}>
                  <div style={{fontSize:36,marginBottom:8}}>{g.icon}</div>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:3}}>{g.label}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{g.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════ SLOTS ═══════════════════ */}
        {curPage==="slots"&&(
          <div className="anim-fade-up" style={{padding:"14px 0 0"}}>
            <GameHeader title="🎰 Слоты"/>
            <div style={{padding:"0 16px"}}>
              <div className="glass" style={{borderRadius:20,padding:"22px 16px",marginBottom:10,textAlign:"center"}}>
                <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:16}}>
                  {reels.map((s,i)=>(
                    <div key={i} style={{width:80,height:90,background:"rgba(0,0,0,.3)",borderRadius:14,border:`1.5px solid rgba(255,255,255,${rSpin[i]?.25:.1})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:46,transition:"border-color .3s",filter:rSpin[i]?"blur(3px)":"none",boxShadow:(!rSpin[i]&&slotsMsg.w)?"0 0 20px rgba(255,200,50,.3)":"none"}}>
                      {s}
                    </div>
                  ))}
                </div>
                <div style={{fontWeight:700,fontSize:16,color:slotsMsg.w===true?"#fbbf24":slotsMsg.w===false?"#f87171":"rgba(255,255,255,.5)",minHeight:22}}>{slotsMsg.t}</div>
              </div>
              <BetRow/>
              <BigBtn onClick={spinSlots} disabled={busy}>Spin 🎰</BigBtn>
              <div className="glass" style={{borderRadius:14,padding:12,marginTop:10}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Выплаты</div>
                {[["💎💎💎","×50"],["7️⃣7️⃣7️⃣","×20"],["🍇🍇🍇","×10"],["🍒🍒🍒","×8"],["⭐⭐⭐","×6"],["Три совпадения","×4"],["Два совпадения","×1.5"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.05)",fontSize:13,color:"rgba(255,255,255,.7)"}}>
                    <span>{k}</span><span style={{fontWeight:700,color:"#fbbf24"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ ROULETTE ═══════════════════ */}
        {curPage==="roulette"&&(
          <div className="anim-fade-up" style={{padding:"14px 0 0"}}>
            <GameHeader title="🎡 Рулетка"/>
            <div style={{padding:"0 16px"}}>
              <div className="glass" style={{borderRadius:20,padding:"20px 14px",marginBottom:10,textAlign:"center"}}>
                {/* Wheel */}
                <div style={{position:"relative",width:180,margin:"0 auto 16px"}}>
                  <div style={{width:180,height:180,borderRadius:"50%",
                    background:"conic-gradient(#c0392b 0 9.7deg,#222 9.7deg 19.4deg,#c0392b 19.4deg 29.1deg,#222 29.1deg 38.8deg,#c0392b 38.8deg 48.5deg,#222 48.5deg 58.2deg,#c0392b 58.2deg 67.9deg,#222 67.9deg 77.6deg,#c0392b 77.6deg 87.3deg,#222 87.3deg 97deg,#c0392b 97deg 106.7deg,#222 106.7deg 116.4deg,#c0392b 116.4deg 126.1deg,#222 126.1deg 135.8deg,#c0392b 135.8deg 145.5deg,#222 145.5deg 155.2deg,#c0392b 155.2deg 164.9deg,#0a6622 164.9deg 174.6deg,#c0392b 174.6deg 184.3deg,#222 184.3deg 194deg,#c0392b 194deg 203.7deg,#222 203.7deg 213.4deg,#c0392b 213.4deg 223.1deg,#222 223.1deg 232.8deg,#c0392b 232.8deg 242.5deg,#222 242.5deg 252.2deg,#c0392b 252.2deg 261.9deg,#222 261.9deg 271.6deg,#c0392b 271.6deg 281.3deg,#222 281.3deg 291deg,#c0392b 291deg 300.7deg,#222 300.7deg 310.4deg,#c0392b 310.4deg 320.1deg,#222 320.1deg 329.8deg,#c0392b 329.8deg 339.5deg,#222 339.5deg 349.2deg,#c0392b 349.2deg 360deg)",
                    border:"3px solid rgba(255,255,255,.15)",
                    transition:rouSpin?"none":"transform 3.6s cubic-bezier(.17,.67,.12,.99)",
                    transform:`rotate(${rouDeg}deg)`,
                    boxShadow:"0 4px 24px rgba(0,0,0,.5)"
                  }}/>
                  <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",fontSize:20,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.6))"}}>▼</div>
                  <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,.9)",boxShadow:"0 2px 8px rgba(0,0,0,.4)"}}/>
                </div>
                {rouResult
                  ? <div><div style={{fontSize:38,fontFamily:"'DM Serif Display',serif",color:rouResult.col==="red"?"#f87171":rouResult.col==="black"?"#aaa":"#4ade80"}}>{rouResult.num}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:4}}>{rouResult.col==="red"?"Красное":rouResult.col==="black"?"Чёрное":"Зеро"}</div></div>
                  : <div style={{fontSize:13,color:"rgba(255,255,255,.35)"}}>Выбери ставку</div>
                }
              </div>
              {/* Bet options */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                {[
                  {id:"red",  label:"Красное",color:"rgba(239,68,68,.25)",bc:"rgba(239,68,68,.4)",  tc:"#f87171",mult:"×2"},
                  {id:"black",label:"Чёрное", color:"rgba(50,50,50,.5)",  bc:"rgba(255,255,255,.15)",tc:"#ccc",  mult:"×2"},
                  {id:"green",label:"Зеро",   color:"rgba(22,163,74,.2)", bc:"rgba(74,222,128,.35)",tc:"#4ade80",mult:"×14"},
                  {id:"odd",  label:"Нечёт",  color:"rgba(59,130,246,.2)",bc:"rgba(96,165,250,.35)",tc:"#93c5fd",mult:"×2"},
                  {id:"even", label:"Чётное", color:"rgba(139,92,246,.2)",bc:"rgba(167,139,250,.35)",tc:"#c4b5fd",mult:"×2"},
                  {id:"hi",   label:"19-36",  color:"rgba(245,158,11,.2)",bc:"rgba(251,191,36,.35)",tc:"#fcd34d",mult:"×2"},
                ].map(o=>(
                  <button key={o.id} className="rou-bet-opt" onClick={()=>setRouChoice(o.id)} style={{background:rouChoice===o.id?o.color.replace(",.2",",.4"):o.color,borderColor:rouChoice===o.id?o.bc:"rgba(255,255,255,.08)",border:`1.5px solid ${rouChoice===o.id?o.bc:"rgba(255,255,255,.08)"}`,color:rouChoice===o.id?o.tc:"rgba(255,255,255,.6)"}}>
                    {o.label}<br/><span style={{fontSize:10,opacity:.7}}>{o.mult}</span>
                  </button>
                ))}
              </div>
              <BetRow/>
              <BigBtn onClick={spinRou} disabled={busy}>Крутить 🎡</BigBtn>
            </div>
          </div>
        )}

        {/* ═══════════════════ BLACKJACK ═══════════════════ */}
        {curPage==="blackjack"&&(
          <div className="anim-fade-up" style={{padding:"14px 0 0"}}>
            <GameHeader title="🃏 Блэкджек"/>
            <div style={{padding:"0 16px"}}>
              <div className="glass" style={{borderRadius:20,padding:18,marginBottom:10}}>
                {/* Dealer */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginBottom:8}}>Дилер {bjDealer.length>0&&bjPhase!=="playing"?`(${handScore(bjDealer)})`:""}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {bjDealer.map((c,i)=>(
                      (bjPhase==="playing"&&i===1)
                        ? <div key={i} className="bj-card-back"/>
                        : <div key={i} className="bj-card"><span style={{color:cardColor(c.s)}}>{c.v}</span><span style={{color:cardColor(c.s),fontSize:8}}>{c.s}</span></div>
                    ))}
                    {bjDealer.length===0&&<div style={{color:"rgba(255,255,255,.2)",fontSize:13}}>Нет карт</div>}
                  </div>
                </div>
                <div style={{height:1,background:"rgba(255,255,255,.07)",marginBottom:14}}/>
                {/* Player */}
                <div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginBottom:8}}>Вы {bjPlayer.length>0?`(${handScore(bjPlayer)})`:""}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {bjPlayer.map((c,i)=>(
                      <div key={i} className="bj-card"><span style={{color:cardColor(c.s)}}>{c.v}</span><span style={{color:cardColor(c.s),fontSize:8}}>{c.s}</span></div>
                    ))}
                    {bjPlayer.length===0&&<div style={{color:"rgba(255,255,255,.2)",fontSize:13}}>Нет карт</div>}
                  </div>
                </div>
                {bjMsg&&<div style={{marginTop:12,textAlign:"center",fontWeight:700,fontSize:15,color:"#fbbf24"}}>{bjMsg}</div>}
              </div>
              <BetRow/>
              {bjPhase==="idle"&&<BigBtn onClick={bjDeal}>Раздать карты 🃏</BigBtn>}
              {bjPhase==="playing"&&(
                <div style={{display:"flex",gap:8}}>
                  <BigBtn onClick={bjHit} style={{flex:1}}>Ещё карту</BigBtn>
                  <BigBtn onClick={bjStand} style={{flex:1,background:"rgba(255,255,255,.06)"}}>Стоп</BigBtn>
                </div>
              )}
              {bjPhase==="done"&&<BigBtn onClick={bjReset}>Новая игра</BigBtn>}
            </div>
          </div>
        )}

        {/* ═══════════════════ CRASH ═══════════════════ */}
        {curPage==="crash"&&(
          <div className="anim-fade-up" style={{padding:"14px 0 0"}}>
            <GameHeader title="🚀 Краш"/>
            <div style={{padding:"0 16px"}}>
              <div className="glass" style={{borderRadius:20,padding:"32px 16px",marginBottom:10,textAlign:"center"}}>
                <div className="crash-multiplier" style={{color:crPhase==="crashed"?"#f87171":crPhase==="cashedout"?"#4ade80":"#fff",marginBottom:8}}>
                  ×{crMult.toFixed(2)}
                </div>
                <div style={{fontSize:13,color:"rgba(255,255,255,.4)",minHeight:20}}>
                  {crPhase==="idle"&&"Сделай ставку и запускай"}
                  {crPhase==="running"&&"Лети! Кэшауться вовремя!"}
                  {crPhase==="crashed"&&"💥 Краш!"}
                  {crPhase==="cashedout"&&`✅ Кэшаут на ×${crCashedAt?.toFixed(2)}`}
                </div>
              </div>
              <BetRow/>
              {crPhase==="idle"&&<BigBtn onClick={crStart}>Запуск 🚀</BigBtn>}
              {crPhase==="running"&&<BigBtn onClick={crCashout} style={{background:"rgba(74,222,128,.15)",borderColor:"rgba(74,222,128,.3)"}}>Кэшаут ×{crMult.toFixed(2)}</BigBtn>}
              {(crPhase==="crashed"||crPhase==="cashedout")&&<BigBtn onClick={()=>{setCrPhase("idle");setCrMult(1.00);}}>Снова 🚀</BigBtn>}
            </div>
          </div>
        )}

        {/* ═══════════════════ MINES ═══════════════════ */}
        {curPage==="mines"&&(
          <div className="anim-fade-up" style={{padding:"14px 0 0"}}>
            <GameHeader title="💣 Мины"/>
            <div style={{padding:"0 16px"}}>
              {/* Grid */}
              <div className="glass" style={{borderRadius:20,padding:14,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Множитель: <span style={{fontWeight:700,color:"#fbbf24"}}>×{mMult.toFixed(2)}</span></div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Мины: <span style={{fontWeight:700,color:"#f87171"}}>{mMines}</span></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                  {Array(25).fill(0).map((_,i)=>{
                    const rev=mRevealed[i];
                    return(
                      <div key={i} className={`mine-cell${rev==="safe"?" revealed-safe":rev==="mine"?" revealed-mine":""}`}
                        onClick={()=>mReveal(i)}>
                        {rev==="safe"?"💎":rev==="mine"?"💣":""}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Mine count */}
              {mPhase==="idle"&&(
                <div className="glass" style={{borderRadius:14,padding:12,marginBottom:10}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Количество мин</div>
                  <div style={{display:"flex",gap:6}}>
                    {[3,5,8,12].map(n=>(
                      <button key={n} className={`chip${mMines===n?" active":""}`} onClick={()=>setMMines(n)} style={{flex:1}}>{n}</button>
                    ))}
                  </div>
                </div>
              )}
              <BetRow/>
              {mPhase==="idle"&&<BigBtn onClick={mStart}>Начать 💣</BigBtn>}
              {mPhase==="playing"&&<BigBtn onClick={mCashout} style={{background:"rgba(74,222,128,.12)",borderColor:"rgba(74,222,128,.25)"}}>Кэшаут ×{mMult.toFixed(2)}</BigBtn>}
              {mPhase==="done"&&<BigBtn onClick={()=>{setMPhase("idle");setMGrid(null);setMRevealed(Array(25).fill(null));setMMult(1);}}>Снова 💣</BigBtn>}
            </div>
          </div>
        )}

        {/* ═══════════════════ WHEEL ═══════════════════ */}
        {curPage==="wheel"&&(
          <div className="anim-fade-up" style={{padding:"14px 0 0"}}>
            <GameHeader title="🎡 Колесо удачи"/>
            <div style={{padding:"0 16px"}}>
              <div className="glass" style={{borderRadius:20,padding:20,marginBottom:10,textAlign:"center"}}>
                {/* Wheel SVG */}
                <div style={{position:"relative",width:210,margin:"0 auto 14px"}}>
                  <svg viewBox="0 0 200 200" width="210" height="210" style={{transition:wSpin?"none":"transform 4s cubic-bezier(.17,.67,.12,.99)",transform:`rotate(${wDeg}deg)`}}>
                    {WHEEL_SEGS.map((seg,i)=>{
                      const n=WHEEL_SEGS.length,angle=360/n;
                      const startA=(i*angle-90)*Math.PI/180;
                      const endA=((i+1)*angle-90)*Math.PI/180;
                      const x1=100+90*Math.cos(startA),y1=100+90*Math.sin(startA);
                      const x2=100+90*Math.cos(endA),y2=100+90*Math.sin(endA);
                      const midA=((i+.5)*angle-90)*Math.PI/180;
                      const tx=100+62*Math.cos(midA),ty=100+62*Math.sin(midA);
                      return(
                        <g key={i}>
                          <path d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`} fill={seg.color} stroke="rgba(0,0,0,.2)" strokeWidth="1"/>
                          <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="DM Sans,sans-serif">{seg.label}</text>
                        </g>
                      );
                    })}
                    <circle cx="100" cy="100" r="14" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.3)" strokeWidth="2"/>
                  </svg>
                  <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:22,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.5))"}}>▼</div>
                </div>
                {wResult&&<div style={{fontWeight:700,fontSize:16,color:wResult.mult>0?"#fbbf24":"#f87171"}}>{wResult.mult>0?`×${wResult.mult} Выигрыш!`:"Нет выигрыша"}</div>}
              </div>
              <BetRow/>
              <BigBtn onClick={spinWheel} disabled={busy||wSpin}>Крутить!</BigBtn>
            </div>
          </div>
        )}

        {/* ═══════════════════ DICE ═══════════════════ */}
        {curPage==="dice"&&(
          <div className="anim-fade-up" style={{padding:"14px 0 0"}}>
            <GameHeader title="🎲 Кости"/>
            <div style={{padding:"0 16px"}}>
              <div className="glass" style={{borderRadius:20,padding:24,marginBottom:10,textAlign:"center"}}>
                <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:20,marginBottom:16}}>
                  {[0,1].map(i=>(
                    <div key={i} style={{width:80,height:80,background:"rgba(0,0,0,.35)",borderRadius:16,border:"1.5px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:46,filter:dRoll?"blur(2px)":"none",transition:"filter .1s"}}>
                      {DICE_F[dVals[i]-1]}
                    </div>
                  ))}
                </div>
                {dMsg&&<div style={{fontWeight:700,fontSize:15,color:dMsg.w?"#fbbf24":"#f87171"}}>{dMsg.t}</div>}
              </div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                {[{id:"hi",label:"📈 Выше (4-6)",mult:"×1.9"},{id:"lo",label:"📉 Ниже (1-3)",mult:"×1.9"}].map(d=>(
                  <button key={d.id} onClick={()=>setDChoice(d.id)} className="glass-btn" style={{flex:1,padding:12,borderRadius:12,background:dChoice===d.id?"rgba(255,255,255,.14)":"rgba(255,255,255,.05)",borderColor:dChoice===d.id?"rgba(255,255,255,.3)":"rgba(255,255,255,.1)",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer",textAlign:"center"}}>
                    {d.label}<br/><span style={{fontSize:11,opacity:.5}}>{d.mult}</span>
                  </button>
                ))}
              </div>
              <BetRow/>
              <BigBtn onClick={rollDice} disabled={busy}>Бросить 🎲</BigBtn>
            </div>
          </div>
        )}

        {/* ═══════════════════ COINFLIP ═══════════════════ */}
        {curPage==="coinflip"&&(
          <div className="anim-fade-up" style={{padding:"14px 0 0"}}>
            <GameHeader title="🪙 Монетка"/>
            <div style={{padding:"0 16px"}}>
              <div className="glass" style={{borderRadius:20,padding:28,marginBottom:10,textAlign:"center"}}>
                <div style={{width:100,height:100,borderRadius:"50%",background:"linear-gradient(135deg,#d4a017,#f0c040)",margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:54,boxShadow:"0 4px 20px rgba(212,160,23,.3)",animation:cFlip?"flipCard .15s steps(1) infinite":"none"}}>
                  {cSide==="H"?"🦅":"🔵"}
                </div>
                {cMsg&&<div style={{fontWeight:700,fontSize:15,color:cMsg.w?"#fbbf24":"#f87171"}}>{cMsg.t}</div>}
              </div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                {[{id:"H",label:"🦅 Орёл"},{id:"T",label:"🔵 Решка"}].map(c=>(
                  <button key={c.id} onClick={()=>setCChoice(c.id)} className="glass-btn" style={{flex:1,padding:14,borderRadius:12,background:cChoice===c.id?"rgba(255,255,255,.14)":"rgba(255,255,255,.05)",borderColor:cChoice===c.id?"rgba(255,255,255,.3)":"rgba(255,255,255,.1)",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",textAlign:"center"}}>
                    {c.label}
                  </button>
                ))}
              </div>
              <BetRow/>
              <BigBtn onClick={flipCoin} disabled={busy}>Бросить 🪙</BigBtn>
            </div>
          </div>
        )}

        {/* ═══════════════════ LEADERBOARD ═══════════════════ */}
        {curPage==="leaderboard"&&(
          <div className="anim-fade-up" style={{padding:"14px 16px 0"}}>
            <div className="display" style={{fontSize:22,marginBottom:14}}>Лидерборд</div>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[["coins","💰 Монеты"],["wins","🏅 Победы"],["games","🎮 Игры"]].map(([m,l])=>(
                <button key={m} onClick={()=>setLbMode(m)} className="glass-btn" style={{flex:1,padding:8,borderRadius:10,background:lbMode===m?"rgba(255,255,255,.12)":"rgba(255,255,255,.04)",borderColor:lbMode===m?"rgba(255,255,255,.25)":"rgba(255,255,255,.08)",color:lbMode===m?"#fff":"rgba(255,255,255,.4)",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:11,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
            {[...lb].sort((a,b)=>lbMode==="coins"?b.coins-a.coins:lbMode==="wins"?b.wins-a.wins:b.games-a.games).map((e,i)=>{
              const isMe=e.id===pl.id;
              const rank=i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
              return(
                <div key={e.id} className="glass" style={{borderRadius:14,padding:"11px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10,background:isMe?"rgba(255,200,50,.06)":"rgba(255,255,255,.04)",borderColor:isMe?"rgba(255,200,50,.2)":"rgba(255,255,255,.07)"}}>
                  <div className={i<3?`lb-rank-${i+1}`:""} style={{fontWeight:700,width:30,textAlign:"center",fontSize:i<3?18:13,color:i>=3?"rgba(255,255,255,.4)":undefined}}>{rank}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}{isMe?" 👈":""}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>Ур.{e.level||1} · {e.wins||0} побед</div>
                  </div>
                  <div style={{fontWeight:700,fontSize:14,color:"#fbbf24",flexShrink:0}}>
                    {lbMode==="coins"?`🪙${fmt(e.coins)}`:lbMode==="wins"?`${e.wins||0}`:e.games||0}
                  </div>
                </div>
              );
            })}
            {lb.length===0&&<div style={{textAlign:"center",color:"rgba(255,255,255,.3)",padding:40}}>Загрузка...</div>}
          </div>
        )}

        {/* ═══════════════════ SHOP ═══════════════════ */}
        {curPage==="shop"&&(
          <div className="anim-fade-up" style={{padding:"14px 16px 0"}}>
            <div className="display" style={{fontSize:22,marginBottom:14}}>Магазин</div>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[["avatars","Аватары"],["titles","Титулы"],["boosts","Бустеры"]].map(([c,l])=>(
                <button key={c} onClick={()=>setShopCat(c)} className="glass-btn" style={{flex:1,padding:8,borderRadius:10,background:shopCat===c?"rgba(255,255,255,.12)":"rgba(255,255,255,.04)",borderColor:shopCat===c?"rgba(255,255,255,.25)":"rgba(255,255,255,.08)",color:shopCat===c?"#fff":"rgba(255,255,255,.4)",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>

            {shopCat==="avatars"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {AVATARS_SHOP.map(item=>{
                  const owned=(pl.inventory||[]).includes(item.id)||item.price===0;
                  const equipped=pl.equippedAv===item.icon;
                  return(
                    <div key={item.id} onClick={()=>buyShop(item,"avatars")} className="game-card" style={{padding:"16px 12px",textAlign:"center",borderColor:equipped?"rgba(255,200,50,.3)":owned?"rgba(255,255,255,.12)":"rgba(255,255,255,.07)"}}>
                      {equipped&&<div style={{position:"absolute",top:7,right:7,background:"rgba(255,200,50,.2)",borderRadius:8,fontSize:10,padding:"2px 7px",fontWeight:700,color:"#fbbf24",border:"1px solid rgba(255,200,50,.3)"}}>Надет</div>}
                      {owned&&!equipped&&<div style={{position:"absolute",top:7,right:7,background:"rgba(74,222,128,.15)",borderRadius:8,fontSize:10,padding:"2px 7px",fontWeight:700,color:"#4ade80",border:"1px solid rgba(74,222,128,.25)"}}>Есть</div>}
                      <div style={{fontSize:36,marginBottom:8}}>{item.icon}</div>
                      <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>{item.name}</div>
                      <div className="pill" style={{fontSize:12,fontWeight:700,color:owned?"#4ade80":"#fbbf24"}}>
                        {owned?(equipped?"Активен":"Надеть"):item.price===0?"Бесплатно":`🪙 ${fmt(item.price)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {shopCat==="titles"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {TITLES_SHOP.map(item=>{
                  const owned=(pl.inventory||[]).includes(item.id)||item.price===0;
                  const equipped=pl.equippedTitle===item.name;
                  return(
                    <div key={item.id} onClick={()=>buyShop(item,"titles")} className="glass" style={{borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:equipped?"rgba(255,200,50,.06)":"rgba(255,255,255,.04)",borderColor:equipped?"rgba(255,200,50,.2)":"rgba(255,255,255,.07)"}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:15}}>{item.name}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>Титул игрока</div>
                      </div>
                      <div className="pill" style={{fontSize:12,fontWeight:700,color:equipped?"#fbbf24":owned?"#4ade80":"rgba(255,255,255,.6)"}}>
                        {owned?(equipped?"Активен":"Надеть"):item.price===0?"Бесплатно":`🪙 ${fmt(item.price)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {shopCat==="boosts"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {BOOST_SHOP.map(item=>{
                  const owned=(pl.inventory||[]).includes(item.id);
                  return(
                    <div key={item.id} onClick={()=>buyShop(item,"boosts")} className="game-card" style={{padding:"16px 12px",textAlign:"center"}}>
                      <div style={{fontSize:34,marginBottom:8}}>{item.icon}</div>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{item.name}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:8,lineHeight:1.3}}>{item.desc}</div>
                      <div className="pill" style={{fontSize:12,fontWeight:700,color:owned?"#4ade80":"#fbbf24"}}>
                        {owned?"▶ Активировать":`🪙 ${fmt(item.price)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ PROFILE ═══════════════════ */}
        {curPage==="profile"&&(
          <div className="anim-fade-up" style={{padding:"14px 16px 0"}}>
            <div className="display" style={{fontSize:22,marginBottom:16}}>Профиль</div>

            {/* Avatar + name */}
            <div className="glass" style={{borderRadius:20,padding:20,marginBottom:12,textAlign:"center"}}>
              <div style={{width:72,height:72,borderRadius:20,background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 12px",border:"1.5px solid rgba(255,255,255,.12)"}}>{pl.equippedAv||"🐺"}</div>
              {!editName
                ? <>
                    <div style={{fontWeight:700,fontSize:20,marginBottom:4}}>{pl.name}</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:14}}>{pl.equippedTitle||"Новичок"} · Ур. {pl.level}</div>
                    <button onClick={()=>{setEditName(true);setNameInput(pl.name);}} className="glass-btn" style={{padding:"8px 24px",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600}}>Изменить ник</button>
                  </>
                : <div style={{display:"flex",gap:8,marginTop:4}}>
                    <input className="glass-input" value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Новый ник" maxLength={20} onKeyDown={e=>{if(e.key==="Enter")saveName();}}/>
                    <button onClick={saveName} className="glass-btn" style={{padding:"10px 16px",borderRadius:12,cursor:"pointer",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:700,whiteSpace:"nowrap"}}>OK</button>
                  </div>
              }
            </div>

            {/* Stats */}
            <div className="glass" style={{borderRadius:20,padding:16,marginBottom:12}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Статистика</div>
              {[["🪙 Баланс",fmt(pl.balance)+" монет"],["🏅 Побед",pl.wins],["🎮 Игр сыграно",pl.games],["💰 Лучший выигрыш",fmt(pl.bestWin)+" монет"],["⬆️ Уровень",pl.level],["🔥 Серия дней",pl.dailyStreak||0]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)",fontSize:14}}>
                  <span style={{color:"rgba(255,255,255,.5)"}}>{l}</span>
                  <span style={{fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>

            {/* XP */}
            <div className="glass" style={{borderRadius:20,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13}}>
                <span style={{color:"rgba(255,255,255,.4)"}}>Уровень {pl.level}</span>
                <span style={{fontWeight:700}}>{pl.xp%500} / 500 XP</span>
              </div>
              <div className="xp-bar" style={{height:6}}><div className="xp-fill" style={{width:xpPct+"%",height:"100%"}}/></div>
            </div>
          </div>
        )}

      </div>{/* end content */}

      {/* ═══════════════════ BOTTOM NAV ═══════════════════ */}
      {!game&&(
        <div className="glass-dark" style={{position:"fixed",bottom:0,left:0,right:0,height:66,display:"flex",borderRadius:0,borderLeft:"none",borderRight:"none",borderBottom:"none",zIndex:100}}>
          {[["lobby","🎮","Лобби"],["leaderboard","🏆","Рейтинг"],["shop","🛍️","Магазин"],["profile","👤","Профиль"]].map(([p,e,l])=>(
            <button key={p} className={`nav-item${tab===p?" active":""}`} onClick={()=>setTab(p)}>
              <span className="nav-icon">{e}</span>{l}
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════ DAILY MODAL ═══════════════════ */}
      {showDaily&&(
        <div className="win-modal" onClick={()=>setShowDaily(false)}>
          <div className="glass win-box anim-scale" onClick={e=>e.stopPropagation()} style={{background:"rgba(15,17,23,.95)",border:"1px solid rgba(255,255,255,.12)"}}>
            <div className="display" style={{fontSize:20,marginBottom:4}}>Ежедневная награда</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:16}}>Серия: {pl.dailyStreak||0} дней 🔥</div>
            <div style={{display:"flex",gap:4,marginBottom:18}}>
              {DAILY.map((r,i)=>{
                const done=(pl.dailyStreak||0)>i;
                const cur=(pl.dailyStreak||0)===i&&pl.lastDaily!==today();
                return(
                  <div key={i} className={`streak-day${done?" done":cur?" today":""}`}>
                    <div style={{fontSize:done?16:cur?18:14}}>{done?"✅":r.icon}</div>
                    <div style={{fontSize:9,fontWeight:700,color:cur?"#fbbf24":done?"rgba(255,255,255,.8)":"rgba(255,255,255,.3)",marginTop:2}}>{r.coins>=1000?fmt(r.coins):"+"+r.coins}</div>
                  </div>
                );
              })}
            </div>
            {pl.lastDaily===today()
              ? <><div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:12}}>Уже получено сегодня ✅</div><BigBtn onClick={()=>setShowDaily(false)}>Закрыть</BigBtn></>
              : <BigBtn onClick={claimDaily}>Забрать +{DAILY[((pl.dailyStreak)||0)%7].coins} 🪙</BigBtn>
            }
          </div>
        </div>
      )}

      {/* ═══════════════════ WIN MODAL ═══════════════════ */}
      {winModal&&(
        <div className="win-modal" onClick={()=>setWinModal(null)}>
          <div className="glass win-box anim-scale" onClick={e=>e.stopPropagation()} style={{background:"rgba(15,17,23,.95)",border:"1px solid rgba(255,200,50,.2)"}}>
            <div style={{fontSize:64,marginBottom:12,animation:"scaleIn .4s cubic-bezier(.34,1.4,.64,1)"}}>{winModal.emoji}</div>
            <div className="display" style={{fontSize:22,marginBottom:4,color:"#fbbf24"}}>{winModal.title}</div>
            {winModal.subtitle&&<div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:6}}>{winModal.subtitle}</div>}
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:38,color:"#fbbf24",marginBottom:20}}>+{fmt(winModal.amount)} 🪙</div>
            <BigBtn onClick={()=>setWinModal(null)}>Забрать!</BigBtn>
          </div>
        </div>
      )}

      {/* ═══════════════════ TOAST ═══════════════════ */}
      {toast&&(
        <div className="toast" style={{
          background:toast.type==="win"?"rgba(20,40,20,.95)":toast.type==="lose"?"rgba(40,15,15,.95)":toast.type==="up"?"rgba(20,20,50,.95)":"rgba(20,20,30,.95)",
          border:`1px solid ${toast.type==="win"?"rgba(74,222,128,.3)":toast.type==="lose"?"rgba(248,113,113,.3)":toast.type==="up"?"rgba(167,139,250,.3)":"rgba(255,255,255,.12)"}`,
          color:toast.type==="win"?"#4ade80":toast.type==="lose"?"#f87171":toast.type==="up"?"#c4b5fd":"rgba(255,255,255,.9)",
        }}>{toast.msg}</div>
      )}
    </div>
  );
}
