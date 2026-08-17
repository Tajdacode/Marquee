/* ==========================================================================
   Marquee — application
   Plain ES2020, no build step, no dependencies. One IIFE, no globals leaked.

   Map of this file:
     1. utils           $ , esc, art(), fmt, toast
     2. catalog         CATALOG — every title lives here (all fictional)
     3. state + storage S, persist(), hydrate(), profiles
     4. router          hash routes -> views
     5. components      card(), row(), hero()
     6. views           browse, series, films, new, list, search
     7. detail sheet    synopsis, episode list, similar titles
     8. player          fake playback engine + controls
     9. actions (A)     every data-act handler, keyed by name
    10. global handlers click/input/keydown delegation, scroll, boot

   To add a feature: write a render function, register A["my-action"],
   then put data-act="my-action" in the markup.
   ========================================================================== */

(function(){
"use strict";

/* ============ 1. utils ============ */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pick = a => a[Math.floor(Math.random()*a.length)];
const rnd = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

function hash(str){let h=0;for(const c of String(str))h=(h*31+c.charCodeAt(0))%360;return h}

/* ---------- poster engine ----------
   Every poster is a generated SVG scene — no image files ship. The scene type
   comes from the title (overridable per id, otherwise inferred from genre) and
   every shape is placed by a seeded PRNG, so a given title always draws the
   exact same artwork across reloads. Compositions are built for both the wide
   16:10 card crop and the tall 2:3 Top-10 crop. */

function seedOf(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const LOOKS={ /* hand-assigned where the story suggests a specific image */
  t1:"sea",t2:"road",t3:"corridor",t4:"skyline",t5:"skyline",t6:"ridge",t7:"orbit",t8:"rain",
  t9:"stage",t10:"ridge",t11:"forest",t12:"figure",t13:"sea",t14:"road",t15:"rain",
  f1:"sea",f2:"road",f3:"orbit",f4:"ridge",f5:"skyline",f6:"rain",f7:"skyline",f8:"sea",
  f9:"stage",f10:"ridge",f11:"ridge",f12:"sea",f13:"corridor"
};
const LOOK_BY_GENRE={Drama:"figure",Mystery:"forest",Thriller:"road",Crime:"skyline","Sci-fi":"orbit",
  Fantasy:"ridge",Horror:"forest",Comedy:"skyline",Adventure:"ridge",Documentary:"ridge",
  Romance:"rain",History:"figure",Action:"skyline",Music:"stage"};
const lookOf=t=>LOOKS[t.id]||LOOK_BY_GENRE[t.genres[0]]||"ridge";

/* title face, also genre-driven — see .f-* in styles.css */
const FACE_BY_GENRE={Drama:"serif",History:"serif",Romance:"serif",Documentary:"serif",Music:"serif",
  Thriller:"cond",Crime:"cond",Action:"cond",Mystery:"cond",Horror:"cond",Adventure:"cond",
  "Sci-fi":"tech",Fantasy:"tech",Comedy:"tech"};
const faceOf=t=>"f-"+(FACE_BY_GENRE[t.genres[0]]||"cond");

function colors(t,v){
  const h=t.hue, a=(h+148+v*14)%360;
  return {
    sky1:`hsl(${h} 46% 10%)`, sky2:`hsl(${a} 56% 27%)`,
    glow:`hsl(${(a+24)%360} 92% 65%)`, glow2:`hsl(${(a+52)%360} 88% 58%)`,
    far:`hsl(${h} 32% 22%)`, mid:`hsl(${h} 36% 14%)`,
    near:`hsl(${h} 44% 8%)`,  ink:`hsl(${h} 56% 4%)`
  };
}

const SCENES={};

/* layered ridgelines under a low sun */
SCENES.ridge=(W,H,C,R)=>{
  const hz=H*.70;
  let s=`<defs>
    <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.sky1}"/><stop offset=".58" stop-color="${C.sky2}"/><stop offset="1" stop-color="${C.glow}"/></linearGradient>
    <radialGradient id="sn"><stop offset="0" stop-color="${C.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sk)"/>
  <circle cx="${W*.64}" cy="${hz-H*.05}" r="${H*.34}" fill="url(#sn)"/>
  <circle cx="${W*.64}" cy="${hz-H*.05}" r="${H*.052}" fill="${C.glow}" opacity=".92"/>`;
  const fills=[C.far,C.mid,C.near,C.ink];
  for(let i=0;i<4;i++){
    const base=hz+i*H*.075, amp=H*(.17-i*.032), st=8;
    let d=`M0 ${H} L0 ${base.toFixed(0)}`;
    for(let x=0;x<=st;x++){
      const px=W*x/st, py=base-Math.abs(Math.sin(x*1.25+i*2.1))*amp*(.45+R()*.75);
      d+=` L${px.toFixed(0)} ${py.toFixed(0)}`;
    }
    s+=`<path d="${d} L${W} ${H} Z" fill="${fills[i]}"/>`;
  }
  return s;
};

/* city at night, lit windows */
SCENES.skyline=(W,H,C,R)=>{
  const base=H*.86;
  let s=`<defs>
    <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.ink}"/><stop offset=".5" stop-color="${C.sky1}"/><stop offset="1" stop-color="${C.sky2}"/></linearGradient>
    <radialGradient id="mn"><stop offset="0" stop-color="${C.glow}" stop-opacity=".75"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sk)"/>
  <circle cx="${W*.24}" cy="${H*.22}" r="${H*.26}" fill="url(#mn)"/>
  <circle cx="${W*.24}" cy="${H*.22}" r="${H*.042}" fill="${C.glow}" opacity=".8"/>`;
  let x=-W*.04;
  while(x<W){ const w=W*(.05+R()*.07), h=H*(.14+R()*.2);
    s+=`<rect x="${x.toFixed(0)}" y="${(base-h).toFixed(0)}" width="${w.toFixed(0)}" height="${(h+H*.2).toFixed(0)}" fill="${C.mid}"/>`; x+=w+3; }
  x=-W*.05;
  while(x<W){
    const w=W*(.07+R()*.1), h=H*(.24+R()*.36), y=base-h;
    s+=`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(h+H*.2).toFixed(0)}" fill="${C.ink}"/>`;
    for(let wy=y+H*.026;wy<base-H*.03;wy+=H*.048)
      for(let wx=x+w*.15;wx<x+w-w*.18;wx+=w*.34)
        if(R()>.64) s+=`<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="${(w*.13).toFixed(1)}" height="${(H*.017).toFixed(1)}" fill="${C.glow}" opacity="${(.2+R()*.65).toFixed(2)}"/>`;
    x+=w+4;
  }
  return s;
};

/* horizon, sun column on water, lighthouse */
SCENES.sea=(W,H,C,R)=>{
  const hz=H*.56;
  let s=`<defs>
    <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.sky1}"/><stop offset=".7" stop-color="${C.sky2}"/><stop offset="1" stop-color="${C.glow}"/></linearGradient>
    <linearGradient id="wa" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.near}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
    <radialGradient id="sn"><stop offset="0" stop-color="${C.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sk)"/>
  <circle cx="${W*.42}" cy="${hz-H*.02}" r="${H*.3}" fill="url(#sn)"/>
  <circle cx="${W*.42}" cy="${hz-H*.02}" r="${H*.07}" fill="${C.glow}" opacity=".9"/>
  <rect y="${hz}" width="${W}" height="${H-hz}" fill="url(#wa)"/>`;
  for(let i=0;i<26;i++){
    const y=hz+Math.pow(i/26,1.7)*(H-hz), w=W*(.05+R()*.16)*(.3+i/26);
    s+=`<rect x="${(W*.42-w/2).toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(1+i*.12).toFixed(1)}" fill="${C.glow}" opacity="${(.5-i*.014).toFixed(2)}"/>`;
  }
  const lx=W*.82, ly=hz;
  s+=`<path d="M${lx-W*.018} ${ly} L${lx+W*.018} ${ly} L${lx+W*.012} ${ly-H*.2} L${lx-W*.012} ${ly-H*.2} Z" fill="${C.ink}"/>
      <circle cx="${lx}" cy="${ly-H*.215}" r="${H*.022}" fill="${C.glow}" opacity=".9"/>
      <path d="M${lx} ${ly-H*.215} L${W*.1} ${ly-H*.34} L${W*.1} ${ly-H*.06} Z" fill="${C.glow}" opacity=".07"/>
      <path d="M0 ${H} L0 ${(H*.88).toFixed(0)} Q${W*.2} ${H*.8} ${W*.36} ${H} Z" fill="${C.ink}"/>`;
  return s;
};

/* one-point perspective corridor toward a lit door */
SCENES.corridor=(W,H,C,R)=>{
  const cx=W*.5, cy=H*.48;
  let s=`<rect width="${W}" height="${H}" fill="${C.ink}"/>
  <defs><radialGradient id="dr"><stop offset="0" stop-color="${C.glow}" stop-opacity="1"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient></defs>`;
  for(let i=9;i>=0;i--){
    const t=i/9, w=W*(.06+t*.98), h=H*(.1+t*1.05);
    const x=cx-w/2, y=cy-h/2;
    const shade=[C.sky2,C.far,C.mid,C.near][i%4];
    s+=`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="none" stroke="${shade}" stroke-width="${(1.5+t*4).toFixed(1)}" opacity="${(.25+t*.5).toFixed(2)}"/>`;
    if(i%3===0) s+=`<rect x="${(x+w*.04).toFixed(0)}" y="${(y+h*.16).toFixed(0)}" width="${(w*.02).toFixed(1)}" height="${(h*.1).toFixed(0)}" fill="${C.glow}" opacity="${(.15+t*.35).toFixed(2)}"/>`;
  }
  s+=`<circle cx="${cx}" cy="${cy}" r="${H*.22}" fill="url(#dr)" opacity=".55"/>
      <rect x="${(cx-W*.028).toFixed(0)}" y="${(cy-H*.05).toFixed(0)}" width="${(W*.056).toFixed(0)}" height="${(H*.1).toFixed(0)}" fill="${C.glow}" opacity=".92"/>`;
  return s;
};

/* planet limb from orbit */
SCENES.orbit=(W,H,C,R)=>{
  let s=`<defs>
    <radialGradient id="atm" cx=".5" cy="1" r="1">
      <stop offset=".62" stop-color="${C.glow}" stop-opacity=".55"/><stop offset=".76" stop-color="${C.sky2}" stop-opacity=".2"/><stop offset="1" stop-color="${C.sky2}" stop-opacity="0"/></radialGradient>
    <linearGradient id="pl" x1="0" y1="0" x2=".8" y2="1">
      <stop offset="0" stop-color="${C.sky2}"/><stop offset=".55" stop-color="${C.mid}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.ink}"/>`;
  for(let i=0;i<64;i++){
    const x=R()*W, y=R()*H*.9, r=R()*1.6+.4;
    s+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#fff" opacity="${(.15+R()*.7).toFixed(2)}"/>`;
  }
  const cy=H*1.42, rr=W*.86;
  s+=`<circle cx="${W*.5}" cy="${cy}" r="${rr*1.06}" fill="url(#atm)"/>
      <circle cx="${W*.5}" cy="${cy}" r="${rr}" fill="url(#pl)"/>
      <circle cx="${W*.5}" cy="${cy}" r="${rr}" fill="none" stroke="${C.glow}" stroke-width="2.5" opacity=".7"/>`;
  for(let i=0;i<5;i++){
    const a=(-.5+R())*1.1, x=W*.5+Math.sin(a)*rr*.86, y=cy-Math.cos(a)*rr*.86;
    s+=`<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(W*.14).toFixed(0)}" ry="${(H*.012).toFixed(0)}" fill="${C.glow}" opacity=".13"/>`;
  }
  s+=`<rect x="${(W*.7).toFixed(0)}" y="${(H*.26).toFixed(0)}" width="${(W*.055).toFixed(0)}" height="3.5" fill="${C.glow}" opacity=".85"/>
      <circle cx="${(W*.7).toFixed(0)}" cy="${(H*.26+2).toFixed(0)}" r="4" fill="#fff" opacity=".9"/>`;
  return s;
};

/* trunks in fog, one figure */
SCENES.forest=(W,H,C,R)=>{
  let s=`<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.sky2}"/><stop offset=".55" stop-color="${C.mid}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
    <radialGradient id="hz"><stop offset="0" stop-color="${C.glow}" stop-opacity=".5"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#fg)"/>
  <circle cx="${W*.5}" cy="${H*.6}" r="${H*.42}" fill="url(#hz)"/>`;
  const rows=[[C.far,.34,.030],[C.mid,.55,.045],[C.near,.8,.062],[C.ink,1,.085]];
  rows.forEach(([col,op,wd],ri)=>{
    for(let i=0;i<10-ri;i++){
      const x=R()*W*1.05-W*.02, w=W*wd*(.55+R()*.9), lean=(R()-.5)*W*.02;
      s+=`<path d="M${x.toFixed(0)} ${H} L${(x+w).toFixed(0)} ${H} L${(x+w*.72+lean).toFixed(0)} ${(-H*.05).toFixed(0)} L${(x+w*.16+lean).toFixed(0)} ${(-H*.05).toFixed(0)} Z" fill="${col}" opacity="${op}"/>`;
    }
  });
  const fx=W*.5, fy=H*.86;
  s+=`<ellipse cx="${fx}" cy="${(fy+H*.02).toFixed(0)}" rx="${(W*.05).toFixed(0)}" ry="${(H*.012).toFixed(0)}" fill="${C.ink}" opacity=".7"/>
      <path d="M${fx-W*.017} ${fy} L${fx+W*.017} ${fy} L${fx+W*.012} ${(fy-H*.1).toFixed(0)} L${fx-W*.012} ${(fy-H*.1).toFixed(0)} Z" fill="${C.ink}"/>
      <circle cx="${fx}" cy="${(fy-H*.115).toFixed(0)}" r="${(H*.018).toFixed(0)}" fill="${C.ink}"/>`;
  return s;
};

/* lone figure, long shadow */
SCENES.figure=(W,H,C,R)=>{
  const gy=H*.76;
  let s=`<defs>
    <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.sky1}"/><stop offset=".62" stop-color="${C.sky2}"/><stop offset="1" stop-color="${C.glow}"/></linearGradient>
    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.near}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
    <radialGradient id="sn"><stop offset="0" stop-color="${C.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sk)"/>
  <circle cx="${W*.58}" cy="${gy-H*.03}" r="${H*.32}" fill="url(#sn)"/>
  <circle cx="${W*.58}" cy="${gy-H*.03}" r="${H*.075}" fill="${C.glow}" opacity=".85"/>
  <rect y="${gy}" width="${W}" height="${H-gy}" fill="url(#gr)"/>`;
  for(let i=0;i<7;i++){
    const y=gy+Math.pow(i/7,1.6)*(H-gy);
    s+=`<rect y="${y.toFixed(0)}" width="${W}" height="1.2" fill="${C.glow}" opacity="${(.12-i*.014).toFixed(2)}"/>`;
  }
  const fx=W*.33, fy=gy+H*.04, hh=H*.19;
  s+=`<path d="M${fx} ${fy} L${(fx-W*.34).toFixed(0)} ${H} L${(fx+W*.06).toFixed(0)} ${H} Z" fill="${C.ink}" opacity=".8"/>
      <path d="M${(fx-W*.016).toFixed(0)} ${fy} L${(fx+W*.016).toFixed(0)} ${fy} L${(fx+W*.011).toFixed(0)} ${(fy-hh).toFixed(0)} L${(fx-W*.011).toFixed(0)} ${(fy-hh).toFixed(0)} Z" fill="${C.ink}"/>
      <circle cx="${fx}" cy="${(fy-hh-H*.028).toFixed(0)}" r="${(H*.03).toFixed(0)}" fill="${C.ink}"/>`;
  return s;
};

/* road to a vanishing point */
SCENES.road=(W,H,C,R)=>{
  const hz=H*.52, vx=W*.5;
  let s=`<defs>
    <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.sky1}"/><stop offset=".72" stop-color="${C.sky2}"/><stop offset="1" stop-color="${C.glow}"/></linearGradient>
    <radialGradient id="sn"><stop offset="0" stop-color="${C.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sk)"/>
  <circle cx="${vx}" cy="${hz}" r="${H*.3}" fill="url(#sn)"/>
  <circle cx="${vx}" cy="${hz}" r="${H*.06}" fill="${C.glow}" opacity=".9"/>
  <rect y="${hz}" width="${W}" height="${H-hz}" fill="${C.near}"/>
  <path d="M${(vx-W*.012).toFixed(0)} ${hz} L${(vx+W*.012).toFixed(0)} ${hz} L${(W*1.05).toFixed(0)} ${H} L${(-W*.05).toFixed(0)} ${H} Z" fill="${C.ink}"/>`;
  for(let i=0;i<9;i++){
    const t=Math.pow(i/9,2.1), y=hz+t*(H-hz), w=W*(.004+t*.045), h=H*(.006+t*.05);
    s+=`<rect x="${(vx-w/2).toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${C.glow}" opacity=".55"/>`;
  }
  for(let i=1;i<6;i++){
    const t=Math.pow(i/6,1.9), y=hz+t*(H-hz)*.7, ph=H*(.06+t*.4), off=W*(.08+t*.62);
    [-1,1].forEach(d=>{
      const px=vx+d*off;
      s+=`<rect x="${px.toFixed(0)}" y="${(y-ph).toFixed(0)}" width="${(2+t*7).toFixed(1)}" height="${ph.toFixed(0)}" fill="${C.ink}"/>
          <rect x="${(px-ph*.13).toFixed(0)}" y="${(y-ph).toFixed(0)}" width="${(ph*.28).toFixed(0)}" height="${(2+t*5).toFixed(1)}" fill="${C.ink}"/>`;
    });
  }
  return s;
};

/* rain on glass, neon behind */
SCENES.rain=(W,H,C,R)=>{
  let s=`<defs>
    <radialGradient id="n1"><stop offset="0" stop-color="${C.glow}" stop-opacity=".85"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>
    <radialGradient id="n2"><stop offset="0" stop-color="${C.glow2}" stop-opacity=".7"/><stop offset="1" stop-color="${C.glow2}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.ink}"/>
  <rect width="${W}" height="${H}" fill="${C.sky1}" opacity=".8"/>
  <ellipse cx="${W*.28}" cy="${H*.36}" rx="${W*.3}" ry="${H*.3}" fill="url(#n1)"/>
  <ellipse cx="${W*.74}" cy="${H*.62}" rx="${W*.28}" ry="${H*.28}" fill="url(#n2)"/>
  <ellipse cx="${W*.55}" cy="${H*.2}" rx="${W*.18}" ry="${H*.14}" fill="url(#n1)" opacity=".5"/>`;
  for(let i=0;i<12;i++){
    const y=R()*H;
    s+=`<rect y="${y.toFixed(0)}" width="${W}" height="${(1+R()*2).toFixed(1)}" fill="${C.glow}" opacity="${(.04+R()*.08).toFixed(2)}"/>`;
  }
  for(let i=0;i<44;i++){
    const x=R()*W, y=R()*H, len=H*(.035+R()*.11);
    s+=`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x-len*.22).toFixed(0)}" y2="${(y+len).toFixed(0)}" stroke="#fff" stroke-width="${(.8+R()*1.4).toFixed(1)}" opacity="${(.1+R()*.3).toFixed(2)}"/>`;
  }
  for(let i=0;i<24;i++)
    s+=`<circle cx="${(R()*W).toFixed(0)}" cy="${(R()*H).toFixed(0)}" r="${(1+R()*3.4).toFixed(1)}" fill="#fff" opacity="${(.06+R()*.18).toFixed(2)}"/>`;
  return s;
};

/* empty stage, single spotlight */
SCENES.stage=(W,H,C,R)=>{
  let s=`<defs>
    <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.glow}" stop-opacity=".5"/><stop offset="1" stop-color="${C.glow}" stop-opacity=".04"/></linearGradient>
    <linearGradient id="cu" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.sky2}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
    <radialGradient id="pool"><stop offset="0" stop-color="${C.glow}" stop-opacity=".65"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.ink}"/>
  <path d="M${W*.42} 0 L${W*.58} 0 L${W*.78} ${H*.9} L${W*.22} ${H*.9} Z" fill="url(#sp)"/>
  <ellipse cx="${W*.5}" cy="${H*.89}" rx="${W*.3}" ry="${H*.075}" fill="url(#pool)"/>
  <rect y="${H*.88}" width="${W}" height="${H*.12}" fill="${C.near}"/>`;
  [0,1].forEach(side=>{
    const w=W*.2;
    let d=side?`M${W} 0 L${W} ${H} L${(W-w*.55).toFixed(0)} ${H}`:`M0 0 L0 ${H} L${(w*.55).toFixed(0)} ${H}`;
    for(let i=6;i>=0;i--){
      const y=H*i/6, x=side?W-w*(.55+.12*Math.sin(i*1.7)):w*(.55+.12*Math.sin(i*1.7));
      d+=` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    s+=`<path d="${d} Z" fill="url(#cu)" opacity="${side?.9:1}"/>`;
    for(let i=0;i<7;i++){
      const x=side?W-w*(.06+i*.075):w*(.06+i*.075);
      s+=`<rect x="${x.toFixed(0)}" width="${(w*.02).toFixed(1)}" height="${H}" fill="${C.ink}" opacity="${(.15+R()*.25).toFixed(2)}"/>`;
    }
  });
  return s;
};

/* film grade applied over every scene */
const grade=(W,H)=>`<defs>
  <radialGradient id="vg" cx=".5" cy=".44" r=".8">
    <stop offset=".42" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".66"/></radialGradient>
  </defs><rect width="${W}" height="${H}" fill="url(#vg)"/>`;

/* ---------- real film artwork via TMDB (optional) ----------
   The Movie Database has a free API that licenses real posters, backdrops, and
   episode stills for exactly this use. Paste a key below and the app swaps the
   fictional catalog for real films with real key art; leave it blank and it
   runs on the drawn posters instead. Get a key in about two minutes:
   themoviedb.org -> Settings -> API -> request a key (free, personal use).

   Attribution is required and already sits in the footer. */
const TMDB_KEY = "d60f3443340da0b521e216ddd9be12e3";                       // <-- paste your key here

const TMDB={api:"https://api.themoviedb.org/3",img:"https://image.tmdb.org/t/p"};
const imgURL=(path,size)=>path?`${TMDB.img}/${size}${path}`:null;
const bg=(url,ink="#0D0F16")=>`background-color:${ink};background-image:url('${url}');background-size:cover;background-position:center;background-repeat:no-repeat`;

async function tmdb(path,params={}){
  const u=new URL(TMDB.api+path);
  u.searchParams.set("api_key",TMDB_KEY);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u);
  if(!r.ok) throw new Error("TMDB "+r.status+" on "+path);
  return r.json();
}

let GENRE_NAMES={};
function adapt(x){
  const isTV = x.media_type==="tv" || (!x.title && !!x.name);
  const name = x.title||x.name||"Untitled";
  const date = x.release_date||x.first_air_date||"";
  const gs   = x.genres ? x.genres.map(g=>g.name)
                        : (x.genre_ids||[]).map(g=>GENRE_NAMES[g]).filter(Boolean);
  return {
    id:(isTV?"tv":"mv")+x.id, tmdbId:x.id, live:true,
    kind:isTV?"series":"film", name, year:+date.slice(0,4)||"",
    hue:seedOf(name)%360,
    match:Math.round((x.vote_average||0)*10)||null,
    rating:isTV?"TV":"Film",
    genres:gs.length?gs:["Drama"],
    syn:x.overview||"No synopsis on file for this title.",
    poster:imgURL(x.poster_path,"w500"),
    backdrop:imgURL(x.backdrop_path||x.poster_path,"w1280"),
    runtime:x.runtime||118, seasons:x.number_of_seasons||1, epLen:45,
    cast:[], creator:"", tags:[], badge:null, _eps:{}
  };
}

/* Pull a handful of curated rows. Anything that fails is dropped rather than
   taking the whole page down with it. */
async function loadTMDB(){
  const [mg,tg]=await Promise.all([
    tmdb("/genre/movie/list"), tmdb("/genre/tv/list")
  ]);
  [...mg.genres,...tg.genres].forEach(g=>GENRE_NAMES[g.id]=g.name);

  const shelves=[
    ["Trending this week","/trending/all/week",{}],
    ["Top 10 today","/movie/popular",{},true],
    ["Acclaimed films","/movie/top_rated",{}],
    ["Series people are finishing","/tv/top_rated",{}],
    ["Thrillers","/discover/movie",{with_genres:53,sort_by:"popularity.desc"}],
    ["Science fiction","/discover/movie",{with_genres:878,sort_by:"popularity.desc"}],
    ["Documentaries","/discover/movie",{with_genres:99,sort_by:"popularity.desc"}]
  ];
  const rows=[], seen=new Map();
  for(const [title,path,params,ten] of shelves){
    try{
      const d=await tmdb(path,params);
      const items=(d.results||[]).filter(x=>x.poster_path).map(adapt).slice(0,ten?10:16);
      items.forEach(t=>{ if(!seen.has(t.id)) seen.set(t.id,t); });
      if(items.length) rows.push({title,items:items.map(t=>seen.get(t.id)),ten:!!ten});
    }catch(e){ console.warn("shelf failed:",title,e.message); }
  }
  if(!seen.size) throw new Error("no titles returned");
  CATALOG=[...seen.values()];
  regenreate();
  S.rows=rows;
}

/* full record: runtime, seasons, cast, similar — fetched the first time a
   detail sheet opens, then cached on the title */
async function hydrateTitle(t){
  if(!t.live||t._full) return t;
  const base=t.kind==="series"?"/tv/":"/movie/";
  const d=await tmdb(base+t.tmdbId,{append_to_response:"credits,similar"});
  Object.assign(t,{
    _full:true,
    runtime:d.runtime||t.runtime,
    seasons:d.number_of_seasons||t.seasons,
    genres:(d.genres||[]).map(g=>g.name).filter(Boolean).length?d.genres.map(g=>g.name):t.genres,
    rating:t.kind==="series"?`${d.number_of_seasons||1} season${(d.number_of_seasons||1)>1?"s":""}`:t.rating,
    cast:(d.credits?.cast||[]).slice(0,4).map(c=>c.name),
    creator:(d.created_by?.[0]?.name)||(d.credits?.crew||[]).find(c=>c.job==="Director")?.name||"—",
    tags:(d.genres||[]).slice(0,3).map(g=>g.name),
    similar:(d.similar?.results||[]).filter(x=>x.poster_path).slice(0,6).map(adapt)
  });
  return t;
}
async function hydrateSeason(t,n){
  if(!t.live||t._eps[n]) return;
  const d=await tmdb(`/tv/${t.tmdbId}/season/${n}`);
  t._eps[n]=(d.episodes||[]).map(e=>({
    no:e.episode_number, name:e.name||`Episode ${e.episode_number}`,
    len:e.runtime||t.epLen, syn:e.overview||"No description available.",
    still:imgURL(e.still_path,"w300")
  }));
}

const _posters=new Map();
function art(t,v=0,ratio="wide"){
  /* A live title carries real key art — portrait poster for the tall Top-10
     crop, landscape backdrop everywhere else. Drawn scenes are the fallback,
     so a title with no artwork on file still looks intentional. */
  const real = ratio==="tall" ? (t.poster||t.backdrop) : (t.backdrop||t.poster);
  if(real) return bg(real,`hsl(${t.hue} 56% 4%)`);
  const key=`${t.id}|${v}|${ratio}`;
  if(_posters.has(key)) return _posters.get(key);
  const W=ratio==="tall"?800:1200, H=ratio==="tall"?1200:750;
  const C=colors(t,v), R=mulberry(seedOf(t.id+"|"+v+"|"+ratio));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${(SCENES[lookOf(t)]||SCENES.ridge)(W,H,C,R)}${grade(W,H)}</svg>`;
  /* This lands inside a style="…" attribute, so the data URI must not contain a
     double quote — one would close the attribute and the browser would throw the
     whole image away. encodeURIComponent escapes " but leaves ' alone, so wrap
     in single quotes and escape those too. */
  const uri=encodeURIComponent(svg).replace(/'/g,"%27");
  const css=`background-color:${C.ink};background-image:url('data:image/svg+xml,${uri}');background-size:cover;background-position:center;background-repeat:no-repeat`;
  _posters.set(key,css);
  return css;
}
function mins(n){ return n>=60 ? `${Math.floor(n/60)}h ${n%60}m` : `${n}m`; }
function clock(s){
  s=Math.max(0,Math.round(s));
  const h=Math.floor(s/3600), m=Math.floor(s%3600/60), sec=s%60;
  return (h?h+":"+String(m).padStart(2,"0"):String(m))+":"+String(sec).padStart(2,"0");
}
function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2200);
}

/* ============ 2. catalog (all titles fictional) ============ */
const CAST=["Imogen Bassey","Teodor Vance","Nia Okonjo-Bright","Rafael Sandoval","Margit Halloran",
  "Desmond Quaye","Lark Petrosyan","Yusuf Adeyemi","Corrine Vaught","Silas Rourke","Anneke Duvall",
  "Kwame Baptiste","Rosalind Merrick","Tobias Fenn","Ilse Vandermeer","Junie Castellanos"];
const DIRS=["Aurelie Kwan","Bram Osei","Delphine Rusk","Marcus Ihejirika","Nadia Solvang","Peter Alarcon"];

function T(o){
  return Object.assign({
    kind:"series", rating:"TV-MA", year:2024, match:rnd(87,98),
    cast:[pick(CAST),pick(CAST),pick(CAST)], creator:pick(DIRS),
    hue:hash(o.name), seasons:1, epLen:52, runtime:112, tags:[], genres:[]
  },o);
}

let CATALOG=[
  T({id:"t1",name:"The Salt Line",year:2025,genres:["Drama","Mystery"],seasons:2,badge:"New Season",
    tags:["Slow-burn","Coastal","Ensemble"],
    syn:"A shipping inspector on a dying stretch of coast finds a manifest that doesn't match the cargo — and a town that would rather she didn't ask."}),
  T({id:"t2",name:"Ashfall County",year:2024,genres:["Thriller","Crime"],seasons:3,
    tags:["Gritty","Small-town","Twisty"],
    syn:"Twelve years after the mine closed, the sheriff's daughter comes home to bury him and finds his files on a case he was told to drop."}),
  T({id:"t3",name:"Nightjar",year:2026,genres:["Sci-fi","Thriller"],seasons:1,badge:"New",
    tags:["Cerebral","Near-future","Suspenseful"],
    syn:"A sleep researcher discovers her subjects are dreaming the same corridor. Then one of them wakes up with the key."}),
  T({id:"t4",name:"Paper Cities",year:2025,genres:["Drama"],seasons:2,
    tags:["Character study","Urban","Quietly devastating"],
    syn:"Three architects, one commission, and the neighborhood that will be erased to build it."}),
  T({id:"t5",name:"The Quiet Ledger",year:2024,genres:["Crime","Drama"],seasons:4,
    tags:["Procedural","Cold","Meticulous"],
    syn:"A forensic accountant is very good at finding money that doesn't want to be found. The people who hid it are good at other things."}),
  T({id:"t6",name:"Vermilion Sky",year:2026,genres:["Fantasy","Adventure"],seasons:1,badge:"New",
    tags:["Epic","Visually stunning","Mythic"],
    syn:"When the sun sets red for the ninth day, a courier carrying a sealed letter becomes the last thing standing between two empires."}),
  T({id:"t7",name:"Low Orbit",year:2025,genres:["Sci-fi","Drama"],seasons:2,
    tags:["Claustrophobic","Hard sci-fi","Character-driven"],
    syn:"Six months into a nine-month resupply run, the crew learns their return window closed a week ago and nobody told them."}),
  T({id:"t8",name:"Kestrel & Crow",year:2024,genres:["Comedy","Crime"],seasons:3,
    tags:["Witty","Buddy","Bingeable"],
    syn:"A disbarred lawyer and a retired burglar open a business helping people recover things the law can't. It goes badly, then well, then very badly."}),
  T({id:"t9",name:"The Understudy",year:2025,genres:["Thriller","Drama"],seasons:1,
    tags:["Tense","Theatrical","Unnerving"],
    syn:"She has covered the same role for six years. Opening night, the lead doesn't arrive — and she knows exactly why."}),
  T({id:"t10",name:"Northbound",year:2023,genres:["Adventure","Documentary"],seasons:2,rating:"TV-PG",
    tags:["Sweeping","True story","Uplifting"],
    syn:"Four strangers attempt a 2,400-mile winter crossing that has been completed twice, both times by the same man."}),
  T({id:"t11",name:"Static Bloom",year:2026,genres:["Horror","Mystery"],seasons:1,badge:"New",
    tags:["Eerie","Folk horror","Atmospheric"],
    syn:"The radio station has been off the air since 1994. Every night at 3:12 it plays one song, and the town has learned not to listen."}),
  T({id:"t12",name:"The Fifth Winter",year:2024,genres:["Drama","History"],seasons:2,
    tags:["Period","Aching","Award-winning"],
    syn:"A translator in an occupied city keeps two notebooks: one for the officers, one for the truth."}),
  T({id:"t13",name:"Harbor Lights",year:2025,genres:["Romance","Drama"],seasons:2,rating:"TV-14",
    tags:["Warm","Slow-burn","Feel-good"],
    syn:"She came back to sell the boatyard. He's the only one who knows what her father actually left her."}),
  T({id:"t14",name:"Grainland",year:2023,genres:["Drama","Thriller"],seasons:3,
    tags:["Rural noir","Simmering","Ensemble"],
    syn:"Three farms, one water table, and a drought that turns neighbors into something else entirely."}),
  T({id:"t15",name:"Cold Aperture",year:2026,genres:["Mystery","Thriller"],seasons:1,badge:"New",
    tags:["Twisty","Photographic","Chilling"],
    syn:"A crime-scene photographer notices the same stranger in the background of eleven unrelated cases spanning thirty years."}),

  T({id:"f1",kind:"film",name:"Ninth Harbor",year:2025,runtime:134,genres:["Thriller","Drama"],
    tags:["Tense","Nautical","Slow-burn"],
    syn:"A harbor pilot is asked to bring one unlisted ship in after dark. The fee is a year's wages. The rule is: don't look below deck."}),
  T({id:"f2",kind:"film",name:"The Long Weekend of Marta Vell",year:2024,runtime:118,genres:["Comedy","Drama"],rating:"R",
    tags:["Sharp","Bittersweet","Festival favorite"],
    syn:"Marta has seventy-two hours, one rental car, and a list of four people she needs to apologize to before Monday."}),
  T({id:"f3",kind:"film",name:"Sunflower Protocol",year:2026,runtime:141,genres:["Sci-fi","Action"],badge:"New",
    tags:["Kinetic","Big-screen","Twisty"],
    syn:"The evacuation plan was written for a hundred thousand people. Six hours out, they discover it was written by someone who wanted it to fail."}),
  T({id:"f4",kind:"film",name:"A Map of Small Fires",year:2025,runtime:106,genres:["Drama"],
    tags:["Intimate","Quiet","Beautifully shot"],
    syn:"A wildfire lookout spends her ninth summer alone on the ridge, and this year someone else is on the mountain."}),
  T({id:"f5",kind:"film",name:"Ferrous",year:2024,runtime:127,genres:["Action","Thriller"],rating:"R",
    tags:["Brutal","Stylish","Relentless"],
    syn:"A steelworks foreman has eleven hours to get his crew off site before the buyers arrive, and the buyers arrive early."}),
  T({id:"f6",kind:"film",name:"Blue Hour",year:2023,runtime:98,genres:["Romance","Drama"],rating:"PG-13",
    tags:["Tender","Nocturnal","Music-driven"],
    syn:"Two night-shift workers keep meeting in the twenty minutes between their commutes, and neither will say it out loud."}),
  T({id:"f7",kind:"film",name:"The Gospel of Tin",year:2025,runtime:152,genres:["Drama","History"],
    tags:["Epic","Sprawling","Award-winning"],
    syn:"Four generations of a family that made everything and owned nothing, told backward from the day the factory whistle stopped."}),
  T({id:"f8",kind:"film",name:"Undertow County",year:2026,runtime:113,genres:["Horror","Mystery"],badge:"New",
    tags:["Dread","Coastal","Nasty"],
    syn:"The tide goes out four miles twice a year. This year it takes something with it, and brings something back."}),
  T({id:"f9",kind:"film",name:"Cadence",year:2024,runtime:121,genres:["Drama","Music"],rating:"PG-13",
    tags:["Rousing","Ensemble","Crowd-pleaser"],
    syn:"A washed-out drum corps instructor takes a job at the worst school in the district and refuses to lower the standard."}),
  T({id:"f10",kind:"film",name:"Two Rivers Crossing",year:2025,runtime:129,genres:["Adventure","Drama"],
    tags:["Sweeping","Survival","Emotional"],
    syn:"A guide who swore off the route agrees to take one more party across, for reasons she won't explain to any of them."}),
  T({id:"f11",kind:"film",name:"The Last Good Summer",year:2023,runtime:104,genres:["Comedy","Drama"],rating:"PG-13",
    tags:["Nostalgic","Warm","Coming of age"],
    syn:"Five friends, one lake house, and the last August before everything about their lives becomes permanent."}),
  T({id:"f12",kind:"film",name:"Dead Reckoning",year:2026,runtime:138,genres:["Thriller","Mystery"],badge:"New",
    tags:["Twisty","Cat and mouse","Unpredictable"],
    syn:"A navigator with no memory of the last eleven days is found alive in a lifeboat, and the ship she left has not been reported missing."}),
  T({id:"f13",kind:"film",name:"Bright Fracture",year:2025,runtime:117,genres:["Sci-fi","Drama"],
    tags:["Cerebral","Melancholy","Original"],
    syn:"A physicist keeps receiving letters from herself, all postmarked from a city that hasn't been built yet."}),
];

const byId = id => CATALOG.find(t=>t.id===id);
let GENRES=[...new Set(CATALOG.flatMap(t=>t.genres))].sort();
const regenreate=()=>{GENRES=[...new Set(CATALOG.flatMap(t=>t.genres))].sort()};
/* hero picks flagged titles locally, or just the top of the feed from a live source */
const featured=()=>{const f=CATALOG.filter(t=>t.badge);return (f.length?f:CATALOG).slice(0,4)};

/* episode generator — deterministic per title+season */
const EP_WORDS=["Ledger","Tidewater","The Understory","Blackout","Nine Bells","Salt","The Cartographer",
  "Half Measure","Rope and Wire","Cold Open","The Long Way","Ashes, Later","Signal Fade","Homecoming",
  "The Quiet Part","Undertow","First Frost","Last Light","Static","Weight of Water"];
function episodes(t,season){
  if(t.live) return t._eps[season]||[];
  const n = 6+((hash(t.id+season))%3);
  return Array.from({length:n},(_,i)=>{
    const seed=hash(t.id+season+i);
    return {
      no:i+1,
      name:EP_WORDS[seed%EP_WORDS.length],
      len:t.epLen-6+(seed%14),
      syn:pick([
        "An old debt comes due at the worst possible hour, and the wrong person offers to pay it.",
        "A door that has been locked all season opens, and what's behind it isn't the answer anyone wanted.",
        "Two people who have avoided each other for years are stuck in the same room until morning.",
        "The plan works. That turns out to be the problem.",
        "A quiet episode that spends its time on one conversation and one very long walk home.",
        "Everything the season has been building toward happens in the first eight minutes."
      ][seed%6])
    };
  });
}

/* ============ 3. state + storage ============ */
const PROFILES=[
  {id:"p1",name:"Taj",hue:38},
  {id:"p2",name:"Guest",hue:265},
  {id:"p3",name:"Weekend",hue:170},
  {id:"p4",name:"Kids",hue:0,kid:true}
];

let S={
  profile:null,
  list:[],                 // my-list ids
  progress:{},             // id -> 0..1
  liked:{},                // id -> 1 | -1
  view:"browse", query:"", genre:"All",
  heroIdx:0,
  rows:null,          // live shelves when a data source is connected
  live:false
};
const hasStore = typeof window!=="undefined" && window.storage && typeof window.storage.get==="function";
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const persist=debounce(async()=>{
  if(!hasStore||!S.profile) return;
  try{ await window.storage.set("marquee:"+S.profile.id,
    JSON.stringify({list:S.list,progress:S.progress,liked:S.liked})); }catch(e){}
},500);
async function loadProfile(p){
  S.profile=p; S.list=[]; S.progress={}; S.liked={};
  if(hasStore){
    try{
      const r=await window.storage.get("marquee:"+p.id);
      if(r&&r.value) Object.assign(S,JSON.parse(r.value));
    }catch(e){ /* first run for this profile */ }
  }
  if(!Object.keys(S.progress).length && !S.live){
    S.progress={t2:.42,f5:.71,t7:.18,t8:.9};   // seeded "continue watching"
  }
}

/* ============ 4. router ============ */
const ROUTES=[
  {id:"browse",label:"Home",hash:"#/browse"},
  {id:"series",label:"Series",hash:"#/series"},
  {id:"films", label:"Films", hash:"#/films"},
  {id:"new",   label:"New & popular",hash:"#/new"},
  {id:"list",  label:"My list",hash:"#/list"}
];
function parseHash(){
  const raw=(location.hash||"#/browse").replace(/^#\/?/,"");
  const [view,arg]=raw.split("/");
  return {view:view||"browse",arg:arg?decodeURIComponent(arg):null};
}
function go(h){ if(location.hash===h) render(); else location.hash=h; }
window.addEventListener("hashchange",()=>{
  const r=parseHash(); S.view=r.view;
  if(r.view==="search") S.query=r.arg||"";
  closeLayer(); render(); window.scrollTo(0,0);
});

/* ============ 5. components ============ */
function flag(t){
  if(!t.badge) return "";
  return `<span class="flag ${t.badge==="New"?"new":""}">${esc(t.badge)}</span>`;
}
function facts(t){
  return `<span class="match">${t.match}% match</span>
    <span class="chipmini">${esc(t.rating)}</span>
    <span>${t.kind==="series"?`${t.seasons} season${t.seasons>1?"s":""}`:mins(t.runtime)}</span>
    <span class="chipmini">HD</span>`;
}
function card(t,opts={}){
  const p=S.progress[t.id], inList=S.list.includes(t.id), liked=S.liked[t.id];
  return `<article class="card" data-id="${t.id}" data-act="open" tabindex="0" aria-label="${esc(t.name)}">
    ${opts.rank?`<div class="rank display">${opts.rank}</div>`:""}
    <div class="art" style="${art(t,0,opts.rank?"tall":"wide")}">
      ${flag(t)}
      <div class="artname display ${faceOf(t)}">${esc(t.name)}</div>
      ${p?`<div class="prog"><i style="width:${Math.round(p*100)}%"></i></div>`:""}
    </div>
    <div class="expand"><div class="exin">
      <div class="exbtns">
        <button class="mini fill" data-act="play" data-id="${t.id}" aria-label="Play ${esc(t.name)}">▶</button>
        <button class="mini ${inList?"on":""}" data-act="list" data-id="${t.id}" aria-label="${inList?"Remove from":"Add to"} my list">${inList?"✓":"+"}</button>
        <button class="mini ${liked===1?"on":""}" data-act="like" data-id="${t.id}" aria-label="Like">👍</button>
        <button class="mini last" data-act="open" data-id="${t.id}" aria-label="More info">▾</button>
      </div>
      <div class="exfacts">${facts(t)}</div>
      <div class="extags">${t.tags.map(x=>`<span>${esc(x)}</span>`).join("")}</div>
    </div></div>
  </article>`;
}
function row(title,list,opts={}){
  if(!list.length) return "";
  return `<section class="row">
    <div class="rowhead"><h2>${esc(title)}</h2><span class="see">Explore all ›</span></div>
    <div class="track">
      <button class="arrow l" data-act="scroll" data-dir="-1" aria-label="Scroll left">‹</button>
      <div class="strip scroll ${opts.ten?"ten":""}">
        ${list.map((t,i)=>card(t,opts.ten?{rank:i+1}:{})).join("")}
      </div>
      <button class="arrow r" data-act="scroll" data-dir="1" aria-label="Scroll right">›</button>
    </div></section>`;
}
function heroHTML(){
  const feat=featured();
  const t=feat[S.heroIdx%feat.length];
  const inList=S.list.includes(t.id);
  return `<section class="hero" id="hero">
    <div class="canvas">${feat.map((f,i)=>`<div class="layer ${i===S.heroIdx%feat.length?"on":""}" style="${art(f,i)}"></div>`).join("")}</div>
    <div class="herobody">
      <div class="herotag">${t.kind==="series"?"Marquee Series":"Marquee Film"}</div>
      <h1 class="herotitle display ${faceOf(t)}">${esc(t.name)}</h1>
      <div class="herofacts">${facts(t)}<span>${t.year}</span><span>${t.genres.join(" · ")}</span></div>
      <p class="herodesc">${esc(t.syn)}</p>
      <div class="herobtns">
        <button class="btn play" data-act="play" data-id="${t.id}">▶ Play</button>
        <button class="btn ghost" data-act="open" data-id="${t.id}">ⓘ More info</button>
        <button class="btn round" data-act="list" data-id="${t.id}" aria-label="${inList?"Remove from":"Add to"} my list">${inList?"✓":"+"}</button>
      </div>
    </div>
    <div class="herodots">${feat.map((_,i)=>`<button class="${i===S.heroIdx%feat.length?"on":""}" data-act="hero-dot" data-i="${i}" aria-label="Featured ${i+1}"></button>`).join("")}</div>
  </section>`;
}

/* ============ 6. views ============ */
const V={};

V.browse=()=>{
  const cont=Object.keys(S.progress).map(byId).filter(Boolean);
  const myList=S.list.map(byId).filter(Boolean);

  /* connected to a live source: render the shelves it returned */
  if(S.rows&&S.rows.length){
    return heroHTML()+`<div class="rows">
      ${row("Continue watching",cont)}
      ${myList.length?row("My list",myList):""}
      ${S.rows.map(r=>row(r.title,r.items,r.ten?{ten:true}:{})).join("")}
    </div>`;
  }

  const trending=[...CATALOG].sort((a,b)=>b.match-a.match).slice(0,10);
  return heroHTML()+`<div class="rows">
    ${row("Continue watching",cont)}
    ${row("Top 10 today",trending,{ten:true})}
    ${myList.length?row("My list",myList):""}
    ${row("New on Marquee",CATALOG.filter(t=>t.year>=2026))}
    ${row("Marquee Originals — Series",CATALOG.filter(t=>t.kind==="series").slice(0,10))}
    ${row("Because you watched Ashfall County",CATALOG.filter(t=>t.genres.some(g=>["Thriller","Crime","Mystery"].includes(g))))}
    ${row("Films worth the whole evening",CATALOG.filter(t=>t.kind==="film"&&t.runtime>115))}
    ${row("Quietly devastating dramas",CATALOG.filter(t=>t.genres.includes("Drama")))}
    ${row("Watch in one sitting",CATALOG.filter(t=>t.kind==="film"&&t.runtime<=120))}
  </div>`;
};

function gridPage(title,list,withGenres=true){
  const filtered = S.genre==="All"?list:list.filter(t=>t.genres.includes(S.genre));
  return `<div class="page">
    <div class="pagehead">
      <h1>${esc(title)}</h1>
      ${withGenres?`<div class="filters">
        ${["All",...GENRES].map(g=>`<button class="fchip ${S.genre===g?"on":""}" data-act="genre" data-g="${esc(g)}">${esc(g)}</button>`).join("")}
      </div>`:""}
    </div>
    ${filtered.length?`<div class="grid">${filtered.map(t=>card(t)).join("")}</div>`
      :`<div class="empty"><b>Nothing in ${esc(S.genre)} yet</b>Try another genre.</div>`}
  </div>`;
}
V.series=()=>gridPage("Series",CATALOG.filter(t=>t.kind==="series"));
V.films =()=>gridPage("Films", CATALOG.filter(t=>t.kind==="film"));
V.new   =()=>gridPage("New & popular",[...CATALOG].sort((a,b)=>b.year-a.year||b.match-a.match));
V.list  =()=>{
  const l=S.list.map(byId).filter(Boolean);
  return l.length?gridPage("My list",l,false)
    :`<div class="page"><div class="pagehead"><h1>My list</h1></div>
      <div class="empty"><b>Your list is empty</b>Add titles with the + button and they'll wait for you here.
      <div style="margin-top:20px"><button class="btn play" data-go="#/browse">Browse titles</button></div></div></div>`;
};
V.search=()=>{
  const q=S.query.trim().toLowerCase();
  if(!q) return `<div class="page"><div class="empty"><b>Search Marquee</b>Type a title, genre, mood, or person.</div></div>`;
  const hits=CATALOG.filter(t=>
    t.name.toLowerCase().includes(q)||t.genres.join(" ").toLowerCase().includes(q)||
    t.tags.join(" ").toLowerCase().includes(q)||t.cast.join(" ").toLowerCase().includes(q)||
    t.syn.toLowerCase().includes(q));
  return `<div class="page">
    <div class="pagehead"><h1>${hits.length} result${hits.length===1?"":"s"}</h1><div class="filters"><span style="color:var(--paper-2);font-size:14px">for “${esc(S.query)}”</span></div></div>
    ${hits.length?`<div class="grid">${hits.map(t=>card(t)).join("")}</div>`
      :`<div class="empty"><b>No matches</b>Try a genre like “thriller”, a mood like “slow-burn”, or a different title.</div>`}
  </div>`;
};

function render(){
  const r=parseHash(); S.view=r.view;
  $("#links").innerHTML=ROUTES.map(x=>`<button class="${S.view===x.id?"on":""}" data-go="${x.hash}">${x.label}</button>`).join("");
  const av=$("#navAvatar");
  if(S.profile) av.outerHTML=`<span id="navAvatar" style="background:hsl(${S.profile.hue} 68% 52%)">${esc(S.profile.name[0])}</span>`;
  const fn=V[S.view]||V.browse;
  $("#main").innerHTML=fn();
  updateArrows();
}

/* ============ 7. detail sheet ============ */
const layer=$("#layer");
function closeLayer(){ layer.innerHTML=""; document.body.classList.remove("locked"); stopPlayer(); }

function openSheet(id,season=1){
  const t=byId(id); if(!t) return;
  const inList=S.list.includes(t.id);
  const eps=episodes(t,season);
  const similar = t.similar || CATALOG.filter(x=>x.id!==t.id&&x.genres.some(g=>t.genres.includes(g))).slice(0,6);
  /* live titles arrive from the shelf endpoints without cast, runtime, or
     episodes — fill those in on first open, then redraw in place */
  if(t.live&&(!t._full||(t.kind==="series"&&!t._eps[season]))){
    Promise.all([hydrateTitle(t), t.kind==="series"?hydrateSeason(t,season):null])
      .then(()=>{ if(layer.querySelector(".sheet")) openSheet(id,season); })
      .catch(e=>console.warn("detail fetch failed:",e.message));
  }
  similar.forEach(x=>{ if(!byId(x.id)) CATALOG.push(x); });
  layer.innerHTML=`<div class="scrim" data-act="scrim">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t.name)}">
      <button class="xbtn" data-act="close" aria-label="Close">✕</button>
      <div class="sheettop" style="${art(t)}">
        <div class="in">
          <h2 class="${faceOf(t)}">${esc(t.name)}</h2>
          <div class="herobtns">
            <button class="btn play" data-act="play" data-id="${t.id}">▶ Play</button>
            <button class="btn round" data-act="list" data-id="${t.id}" aria-label="${inList?"Remove from":"Add to"} my list">${inList?"✓":"+"}</button>
            <button class="btn round" data-act="like" data-id="${t.id}" aria-label="Rate">${S.liked[t.id]===1?"👍":"👍"}</button>
          </div>
        </div>
      </div>
      <div class="sheetbody">
        <div>
          <div class="facts">${facts(t)}<span>${t.year}</span></div>
          <p class="syn">${esc(t.syn)}</p>
        </div>
        <div class="meta">
          <dt>Cast:</dt> <dd>${t.cast.map(c=>`<a href="#/search/${encodeURIComponent(c)}">${esc(c)}</a>`).join(", ")}</dd><br>
          <dt>Genres:</dt> <dd>${t.genres.map(g=>esc(g)).join(", ")}</dd><br>
          <dt>${t.kind==="series"?"Created by":"Directed by"}:</dt> <dd>${esc(t.creator)}</dd><br>
          <dt>This ${t.kind==="series"?"show":"film"} is:</dt> <dd>${t.tags.map(x=>esc(x)).join(", ")}</dd>
        </div>
      </div>
      ${t.kind==="series"?`
        <div class="sechead"><h3>Episodes</h3>
          <select class="sel" data-act="season" data-id="${t.id}" aria-label="Choose season">
            ${Array.from({length:t.seasons},(_,i)=>`<option value="${i+1}"${season===i+1?" selected":""}>Season ${i+1}</option>`).join("")}
          </select></div>
        <div class="eps">${eps.map(e=>`
          <button class="ep" data-act="play" data-id="${t.id}" data-ep="${e.no}" data-season="${season}">
            <span class="no display">${e.no}</span>
            <span class="thumb" style="${e.still?bg(e.still):art(t,e.no%4)}"><span class="pl">▶</span></span>
            <span class="info">
              <h4>${esc(e.name)}<span>${e.len}m</span></h4>
              <p>${esc(e.syn)}</p>
            </span>
          </button>`).join("")}</div>`:""}
      ${similar.length?`<div class="sechead"><h3>More like this</h3></div>
        <div class="simgrid">${similar.map(s=>`
          <button class="sim" data-act="open" data-id="${s.id}">
            <span class="art" style="${art(s)}"><span class="artname display ${faceOf(s)}">${esc(s.name)}</span></span>
            <span class="in"><span class="top"><b style="color:var(--live)">${s.match}% match</b><span class="chipmini">${esc(s.rating)}</span></span>
            <p>${esc(s.syn.slice(0,110))}…</p></span>
          </button>`).join("")}</div>`:""}
    </div></div>`;
  document.body.classList.add("locked");
  layer.querySelector(".xbtn").focus();
}

/* ============ 8. player ============ */
let P={id:null,ep:null,t:0,dur:0,playing:false,vol:.8,muted:false,timer:null,hideTimer:null,next:false};
function openPlayer(id,ep,season){
  const t=byId(id); if(!t) return;
  P={id,ep:ep?+ep:null,season:season?+season:1,t:(S.progress[id]||0)*(t.kind==="series"?t.epLen*60:t.runtime*60),
     dur:(t.kind==="series"?t.epLen*60:t.runtime*60),playing:true,vol:P.vol,muted:false,timer:null,hideTimer:null,next:false};
  if(P.t>P.dur-30) P.t=0;
  drawPlayer(); tick(); nudgeUI();
}
function drawPlayer(){
  const t=byId(P.id); if(!t) return;
  const pct=(P.t/P.dur)*100;
  const showSkip=P.t>8&&P.t<Math.min(120,P.dur*.12);
  const showNext=P.t>P.dur-30&&t.kind==="series";
  const nextEp=P.ep?P.ep+1:2;
  layer.innerHTML=`<div id="player" class="ui" data-act="stage">
    <div class="stage">
      <div class="bg" style="${art(t,(P.ep||1)%4)}"></div>
      <div class="vignette"></div>
      <div class="caption display ${faceOf(t)}">${esc(t.name)}</div>
    </div>
    <div class="ptop">
      <button class="pbtn" data-act="close" aria-label="Back">←</button>
      <div><h3>${esc(t.name)}</h3>
        <div class="sub">${t.kind==="series"?`S${P.season}:E${P.ep||1} · ${esc(episodes(t,P.season)[(P.ep||1)-1]?.name||"")}`:`${t.year} · ${t.genres.join(" · ")}`}</div></div>
    </div>
    ${showSkip?`<button class="skip" data-act="skip-intro">Skip intro</button>`:""}
    ${showNext?`<div class="nextcard"><div class="ring"></div>
      <div class="lbl">Next episode</div>
      <div class="row2"><span class="th" style="${art(t,nextEp%4)}"></span>
        <div><b>${esc(episodes(t,P.season)[nextEp-1]?.name||"Season finale")}</b>
        <div style="color:var(--paper-2);font-size:12.5px">S${P.season}:E${nextEp}</div>
        <button class="btn play" style="padding:6px 14px;margin-top:8px;font-size:13px" data-act="next-ep">▶ Play</button></div></div></div>`:""}
    <div class="pbar">
      <div class="track-row">
        <span class="tnum">${clock(P.t)}</span>
        <div class="seek" data-act="seek"><div class="rail"><div class="fill" style="width:${pct}%"></div></div>
          <div class="knob" style="left:${pct}%"></div></div>
        <span class="tnum">-${clock(P.dur-P.t)}</span>
      </div>
      <div class="pctrls">
        <button class="pbtn" data-act="toggle" aria-label="${P.playing?"Pause":"Play"}">${P.playing?"❚❚":"▶"}</button>
        <button class="pbtn" data-act="back10" aria-label="Back 10 seconds">↺</button>
        <button class="pbtn" data-act="fwd10" aria-label="Forward 10 seconds">↻</button>
        <div class="vol"><button class="pbtn" data-act="mute" aria-label="Mute">${P.muted||P.vol===0?"🔇":"🔊"}</button>
          <input type="range" min="0" max="1" step=".05" value="${P.muted?0:P.vol}" data-act="vol" aria-label="Volume"></div>
        <span class="grow"></span>
        <button class="pbtn" data-act="subs" aria-label="Subtitles">CC</button>
        <button class="pbtn" data-act="speed" aria-label="Playback speed">1×</button>
        <button class="pbtn" data-act="full" aria-label="Fullscreen">⛶</button>
      </div>
    </div>
  </div>`;
  document.body.classList.add("locked");
}
function tick(){
  clearInterval(P.timer);
  P.timer=setInterval(()=>{
    if(!P.playing) return;
    P.t=Math.min(P.dur,P.t+1);
    S.progress[P.id]=P.t/P.dur; persist();
    const el=$("#player"); if(!el){ clearInterval(P.timer); return; }
    const f=$(".seek .fill",el), k=$(".seek .knob",el), nums=$$(".tnum",el);
    const pct=(P.t/P.dur)*100;
    if(f) f.style.width=pct+"%"; if(k) k.style.left=pct+"%";
    if(nums[0]) nums[0].textContent=clock(P.t);
    if(nums[1]) nums[1].textContent="-"+clock(P.dur-P.t);
    const t=byId(P.id);
    const needSkip=P.t>8&&P.t<Math.min(120,P.dur*.12);
    if(needSkip!==!!$(".skip",el)) drawPlayer();
    const needNext=P.t>P.dur-30&&t.kind==="series";
    if(needNext&&!$(".nextcard",el)) drawPlayer();
    if(P.t>=P.dur){ P.playing=false; toast("Finished — thanks for watching"); }
  },1000);
}
function stopPlayer(){ clearInterval(P.timer); clearTimeout(P.hideTimer); P.playing=false; }
function nudgeUI(){
  const el=$("#player"); if(!el) return;
  el.classList.add("ui"); clearTimeout(P.hideTimer);
  P.hideTimer=setTimeout(()=>{ const e=$("#player"); if(e&&P.playing) e.classList.remove("ui"); },2800);
}

/* ============ 9. actions ============ */
const A={};

A.open=(b)=>openSheet(b.dataset.id);
A.play=(b)=>{ closeLayer(); openPlayer(b.dataset.id,b.dataset.ep,b.dataset.season); };
A.close=closeLayer;
A.scrim=(b,e)=>{ if(e.target.classList.contains("scrim")) closeLayer(); };
A.stage=(b,e)=>{ if(e.target.closest(".pbar")||e.target.closest(".ptop")||e.target.closest(".nextcard")||e.target.closest(".skip")) return; A.toggle(); };

A.list=(b)=>{
  const id=b.dataset.id, i=S.list.indexOf(id);
  if(i>=0){ S.list.splice(i,1); toast("Removed from My list"); }
  else { S.list.unshift(id); toast("Added to My list"); }
  persist(); refresh();
};
A.like=(b)=>{
  const id=b.dataset.id;
  S.liked[id]=S.liked[id]===1?0:1;
  toast(S.liked[id]===1?"Thanks — we'll show you more like this":"Rating removed");
  persist(); refresh();
};
A.genre=(b)=>{ S.genre=b.dataset.g; render(); };
A.season=(b)=>{
  const t=byId(b.dataset.id), n=+b.value;
  if(t&&t.live&&!t._eps[n]) hydrateSeason(t,n).then(()=>openSheet(t.id,n)).catch(()=>openSheet(t.id,n));
  else openSheet(b.dataset.id,n);
};

A.scroll=(b)=>{
  const strip=$(".strip",b.closest(".track"));
  strip.scrollBy({left:b.dataset.dir*(strip.clientWidth*.86),behavior:"smooth"});
  setTimeout(updateArrows,420);
};
A["hero-dot"]=(b)=>{ S.heroIdx=+b.dataset.i; renderHero(); };

A["open-search"]=()=>{
  const w=$("#searchwrap"); w.classList.add("open"); $("#q").focus();
};
A.notifs=(b)=>{
  const r=b.getBoundingClientRect();
  layer.innerHTML=`<div class="pop" style="top:${r.bottom+10}px;right:${window.innerWidth-r.right}px;width:300px">
    ${featured().map(t=>`
      <button data-act="open" data-id="${t.id}">
        <span class="sq" style="background:hsl(${t.hue} 68% 46%)"></span>
        <span><b style="display:block;font-size:13.5px">${esc(t.name)}</b>
        <span style="color:var(--paper-2);font-size:12.5px">${t.badge==="New"?"Now streaming":"New season available"}</span></span>
      </button>`).join("")}</div>`;
};
A["prof-menu"]=(b)=>{
  const r=b.getBoundingClientRect();
  layer.innerHTML=`<div class="pop" style="top:${r.bottom+10}px;right:${window.innerWidth-r.right}px">
    ${PROFILES.map(p=>`<button data-act="switch" data-p="${p.id}">
      <span class="sq" style="background:hsl(${p.hue} 68% 52%)">${esc(p.name[0])}</span>${esc(p.name)}${S.profile&&S.profile.id===p.id?" ✓":""}</button>`).join("")}
    <div class="sep"></div>
    <button data-go="#/list">🔖 My list</button>
    <button data-act="gate">↩ Switch profiles</button>
    <button data-act="reset">↺ Reset this profile</button>
  </div>`;
};
A.switch=async(b)=>{ await loadProfile(PROFILES.find(p=>p.id===b.dataset.p)); closeLayer(); render(); toast("Switched to "+S.profile.name); };
A.gate=()=>{ closeLayer(); showGate(); };
A.reset=async()=>{
  if(hasStore&&S.profile){ try{ await window.storage.delete("marquee:"+S.profile.id); }catch(e){} }
  await loadProfile(S.profile); closeLayer(); render(); toast("Profile reset");
};

/* player controls */
A.toggle=()=>{ P.playing=!P.playing; drawPlayer(); nudgeUI(); };
A.back10=()=>{ P.t=Math.max(0,P.t-10); drawPlayer(); nudgeUI(); };
A.fwd10=()=>{ P.t=Math.min(P.dur,P.t+10); drawPlayer(); nudgeUI(); };
A["skip-intro"]=()=>{ P.t=Math.min(P.dur,Math.max(P.t,Math.min(120,P.dur*.12))+1); drawPlayer(); nudgeUI(); };
A["next-ep"]=()=>{ const ep=(P.ep||1)+1; openPlayer(P.id,ep,P.season); };
A.mute=()=>{ P.muted=!P.muted; drawPlayer(); nudgeUI(); };
A.vol=(b)=>{ P.vol=+b.value; P.muted=P.vol===0; };
A.seek=(b,e)=>{
  const r=b.getBoundingClientRect();
  P.t=clamp((e.clientX-r.left)/r.width,0,1)*P.dur; drawPlayer(); nudgeUI();
};
A.subs=()=>toast("Subtitles: English (on)");
A.speed=()=>toast("Playback speed: 1×");
A.full=()=>{
  if(document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(()=>toast("Fullscreen unavailable here"));
};

/* ============ 10. global handlers ============ */
function refresh(){
  if($("#player")) return;
  if(layer.querySelector(".sheet")){
    const id=layer.querySelector(".sheet").getAttribute("aria-label");
    const t=CATALOG.find(x=>x.name===id); render(); if(t) openSheet(t.id);
  } else render();
}
function renderHero(){
  const h=$("#hero"); if(!h) return;
  const scrollY=window.scrollY;
  h.outerHTML=heroHTML(); window.scrollTo(0,scrollY);
}
function updateArrows(){
  $$(".track").forEach(tr=>{
    const s=$(".strip",tr);
    const l=$(".arrow.l",tr), r=$(".arrow.r",tr);
    if(!s) return;
    l.disabled = s.scrollLeft<8;
    r.disabled = s.scrollLeft+s.clientWidth >= s.scrollWidth-8;
  });
}
document.addEventListener("scroll",e=>{
  if(e.target.classList&&e.target.classList.contains("strip")) updateArrows();
},true);

document.addEventListener("click",e=>{
  const actEl=e.target.closest("[data-act]");
  const goEl=e.target.closest("[data-go]");
  if(actEl){
    const fn=A[actEl.dataset.act];
    if(fn){ e.preventDefault(); e.stopPropagation(); fn(actEl,e); return; }
  }
  if(goEl){ e.preventDefault(); closeLayer(); go(goEl.dataset.go); return; }
  if(!e.target.closest(".pop")&&layer.querySelector(".pop")) closeLayer();
  if(!e.target.closest("#searchwrap")&&!$("#q").value) $("#searchwrap").classList.remove("open");
});

document.addEventListener("input",e=>{
  if(e.target.id==="q"){
    S.query=e.target.value;
    if(S.query.trim()){ if(S.view!=="search"){ S.view="search"; history.replaceState(null,"","#/search"); } render(); }
    else if(S.view==="search"){ go("#/browse"); }
  }
});

document.addEventListener("mousemove",()=>{ if($("#player")) nudgeUI(); });

document.addEventListener("keydown",e=>{
  const typing=e.target.matches("input,select,textarea");
  if(e.key==="Escape"){ closeLayer(); if(typing) e.target.blur(); return; }
  if(typing) return;
  if($("#player")){
    if(e.key===" "||e.key==="k"){ e.preventDefault(); A.toggle(); }
    if(e.key==="ArrowRight"){ A.fwd10(); }
    if(e.key==="ArrowLeft"){ A.back10(); }
    if(e.key==="m"){ A.mute(); }
    if(e.key==="f"){ A.full(); }
    return;
  }
  if(e.key==="/"){ e.preventDefault(); A["open-search"](); }
  if(e.key==="Enter"&&document.activeElement.classList.contains("card")){ openSheet(document.activeElement.dataset.id); }
});

window.addEventListener("scroll",()=>{
  $("#nav").classList.toggle("solid",window.scrollY>28);
});

/* hero auto-rotate */
setInterval(()=>{
  if(S.view!=="browse"||layer.innerHTML||document.hidden) return;
  const n=featured().length;
  S.heroIdx=(S.heroIdx+1)%n; renderHero();
},9000);

/* ---- profile gate ---- */
function showGate(){
  $("#app").hidden=true;
  $("#gate").hidden=false;
  $("#gate").innerHTML=`<div class="gatebox">
    <h1>Who's watching?</h1><p>Pick a profile to keep your list and progress separate.</p>
    <div class="profs">${PROFILES.map(p=>`
      <button class="prof ${p.kid?"kid":""}" data-act="choose" data-p="${p.id}">
        <span class="tile display" style="background:hsl(${p.hue} 68% 52%);position:relative">${esc(p.name[0])}</span>
        <span class="nm" style="display:block">${esc(p.name)}</span>
      </button>`).join("")}</div>
  </div>`;
}
A.choose=async(b)=>{
  await loadProfile(PROFILES.find(p=>p.id===b.dataset.p));
  $("#gate").hidden=true; $("#gate").innerHTML="";
  $("#app").hidden=false;
  if(!location.hash) location.hash="#/browse";
  render();
  connectSource();
};

/* Try the live source once, after the UI is already up. A failure here is not
   fatal — the built-in catalog stays on screen and the user gets one line
   explaining why, rather than an empty app. */
async function connectSource(){
  if(!TMDB_KEY) return;
  try{
    await loadTMDB();
    S.live=true; S.progress={}; S.heroIdx=0;
    render();
    toast("Connected — showing real titles");
  }catch(e){
    console.warn("TMDB unavailable:",e.message);
    toast(/401|403/.test(e.message)?"That TMDB key was rejected — check it in app.js"
                                   :"Couldn't reach TMDB — showing the built-in catalog");
  }
}

/* ---- boot ---- */
showGate();
})();