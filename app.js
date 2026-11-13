"use strict";

const shirts = [
  { id: "skulls", name: "BL-01 Chrome Skulls", colours: "Black, Off White, Charcoal, Navy" },
  { id: "key", name: "BL-08 Key Tag", colours: "Black, White, Ash, Brown" },
  { id: "block", name: "BL-05 From the Block", colours: "Black, Vintage Grey, Vintage White, Navy" },
  { id: "grill-black", name: "Grill Tee — Black", colours: "Black" },
  { id: "grill-white", name: "Grill Tee — White", colours: "White" },
  { id: "dice", name: "BL-09 Dice", colours: "Black, Charcoal, Natural, Burgundy" },
  { id: "bubble", name: "BL-10 Bubble B", colours: "Black, White, Charcoal, Olive" }
];

const byId = id => document.getElementById(id);
const stage = byId("stage");
const rack = byId("rack");
const panel = byId("panel");
const panelBody = byId("panel-body");
const asset = (shirt, view) => `assets/${shirt.id}-${view}.${view === "sheet" ? "jpg" : "webp"}`;
const wrap = index => (index % shirts.length + shirts.length) % shirts.length;
let selected = 3;
let restoreFocus;
let detailOpen = false;
let busy = false;
let detailSession = 0;
let face = "front";
const colourChoice = shirts.map(() => 0);
const fabric = (index, side, colour = colourChoice[index]) => colour
  ? `assets/${shirts[index].id}-${colour}-${side}.webp`
  : asset(shirts[index], side);

function renderRack() {
  Array.from(rack.children).forEach((button, index) => {
    const offset = wrap(index - selected + 3) - 3;
    button.style.setProperty("--offset", offset);
    button.style.zIndex = String(8 - Math.abs(offset));
    button.tabIndex = offset === 0 ? 0 : -1;
  });
  byId("current-name").textContent = shirts[selected].name;
  byId("position").textContent = `${String(selected + 1).padStart(2, "0")} / 07`;
}

function select(index) {
  selected = wrap(index);
  renderRack();
}

function showPanel(html, source) {
  panelBody.innerHTML = html;
  if (!panel.open) {
    restoreFocus = source;
    panel.showModal();
  }
  panel.scrollTop = 0;
  byId("close").focus({preventScroll:true});
}

const tagColours = {Black:"#22221f", White:"#faf9f6", "Off White":"#eee9dc", Charcoal:"#484846", Navy:"#18253d", "Vintage Grey":"#787872", "Vintage White":"#e9e3d5", Ash:"#bebeb9", Brown:"#493427", Natural:"#ede6d8", Burgundy:"#782129", Olive:"#53563c"};

function tags(index) {
  const colours = shirts[index].colours.split(", ");
  if (colours.length < 2) return "";
  return `<div class="tags" role="group" aria-label="Pictured colours">${colours.map((label, i) =>
    `<button class="colour-tag" type="button" aria-label="Colour: ${label}" aria-pressed="${i === colourChoice[index]}" data-colour="${i}" style="--tag:${tagColours[label]};--order:${i}"><span>${label}</span></button>`).join("")}</div>`;
}

function visibleRackImage(button) {
  return button.querySelector(button.classList.contains("turned") ? ".rack-front" : ".rack-rest");
}

async function travel(origin, returning, startImage) {
  if (reducedMotion.matches) return;
  const hero = byId("detail-image");
  const dest = hero.getBoundingClientRect();
  if (!dest.width || !origin.width) return;
  const dx = origin.left + origin.width/2 - dest.left - dest.width/2;
  const dy = origin.top + origin.height/2 - dest.top - dest.height/2;
  const frames = springFrames(70,15,850,p => {
    const t = returning ? p : 1-p;
    return {transform:`translate(${dx*t}px,${dy*t}px) scale(${1+(origin.width/dest.width-1)*t},${1+(origin.height/dest.height-1)*t})`};
  });
  const carrier = byId("carrier");
  const shadowFace = new Image();
  shadowFace.className = "travel-face";
  shadowFace.src = startImage;
  shadowFace.alt = "";
  carrier.append(shadowFace);
  await Promise.all([animateTo(carrier,frames,850),animateTo(shadowFace,
    returning ? [{opacity:0},{opacity:1}] : [{opacity:1},{opacity:0}],850)]);
  shadowFace.remove();
}

function showShirt(index, source, navigating = false) {
  const button = rack.children[index];
  const originImage = visibleRackImage(button);
  const origin = originImage.getBoundingClientRect();
  const originSrc = originImage.src;
  const session = ++detailSession;
  resetHover();
  select(index);
  detailOpen = true;
  busy = !reducedMotion.matches;
  face = "front";
  document.body.classList.add("focusing");
  panel.classList.add("focus-panel");
  button.classList.add("lifted");
  const shirt = shirts[selected];
  const sheet = asset(shirt, "sheet");
  showPanel(`
    <div class="detail">
      <div class="product-photo">
        <button class="detail-arrow prev" data-step="-1" aria-label="Previous shirt">←</button>
        <div id="carrier"><div id="rotor"><img id="detail-image" src="${fabric(index, "front")}" alt="${shirt.name}, front"></div>${tags(index)}</div>
        <button class="detail-arrow next" data-step="1" aria-label="Next shirt">→</button>
      </div>
      <div class="detail-info">
        <span class="eyebrow">BLEED Worldwide</span>
        <h2 id="panel-title">${shirt.name}</h2>
        <div class="switcher" role="group" aria-label="Shirt view">
          <button type="button" data-view="front" aria-pressed="true">Front</button>
          <button type="button" data-view="back" aria-pressed="false">Back</button>
        </div>
        <p class="colours"><strong>Pictured colours</strong>${shirt.colours}</p>
      </div>
    </div>
    <details class="sheet">
      <summary>Original product sheet</summary>
      <img loading="lazy" src="${sheet}" alt="${shirt.name} original product sheet with front, back and pictured colours">
      <a href="${sheet}" target="_blank" rel="noopener">Open full-size image ↗</a>
    </details>`, source);
  restoreFocus = source === byId("view") ? source : rack.children[selected];
  if (!navigating) travel(origin,false,originSrc).finally(() => {if (session === detailSession) busy = false;});
}

for (const [index, shirt] of shirts.entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "piece";
  button.setAttribute("aria-label", `View ${shirt.name}`);
  // Show the strongest print on the rack. Each detail view starts on the front.
  const side = ["skulls", "key", "bubble", "dice"].includes(shirt.id) ? "back" : "front";
  button.dataset.rest = side;
  button.innerHTML = `<span class="pivot"><span class="hanger" aria-hidden="true"></span><span class="cloth"><img class="garment rack-rest" src="${asset(shirt, side)}" draggable="false" alt=""><img class="garment rack-front" src="${asset(shirt, "front")}" draggable="false" alt=""></span></span><span class="rack-caption" aria-hidden="true">${shirt.name}</span>`;
  button.addEventListener("click", () => showShirt(index, button));
  rack.append(button);
}
renderRack();
const resetHover = rackMotion(stage, rack.children);

byId("view").addEventListener("click", event => showShirt(selected, event.currentTarget));
byId("previous").addEventListener("click", () => select(selected - 1));
byId("next").addEventListener("click", () => select(selected + 1));
byId("collection-link").addEventListener("click", event => {
  const rows = shirts.map((shirt, index) => `<li><button type="button" data-shirt="${index}"><img src="${asset(shirt, "front")}" alt="">${shirt.name}<span class="go" aria-hidden="true">↗</span></button></li>`).join("");
  showPanel(`<section class="collection"><h2 id="panel-title">Collection</h2><ul>${rows}</ul></section>`, event.currentTarget);
});
byId("about-link").addEventListener("click", event => {
  showPanel(`<section class="about"><img src="assets/monogram.png" alt=""><h2 id="panel-title">BLEED Worldwide</h2><p>Chrome skulls, red dice, city lights. Explore seven graphic tees from BLEED, front and back.</p><span class="eyebrow">Est. 2026 · Made with love</span></section>`, event.currentTarget);
});
async function closePanel() {
  if (!detailOpen) { panel.close(); return; }
  if (panel.classList.contains("returning")) return;
  ++detailSession;
  busy = true;
  panel.classList.add("returning");
  document.body.classList.remove("focusing");
  const carrier = byId("carrier");
  const rect = carrier.getBoundingClientRect();
  panelBody.getAnimations({subtree:true}).forEach(a => a.cancel());
  carrier.querySelectorAll(".travel-face,.dye,.outgoing-face").forEach(el => el.remove());
  // Freeze the in-flight position if Escape interrupts the opening.
  const final = carrier.getBoundingClientRect();
  const target = rack.children[selected].querySelector(".rack-rest");
  if (!reducedMotion.matches && Math.abs(rect.width-final.width)>1) {
    const frame = {transform:`translate(${rect.left-final.left+(rect.width-final.width)/2}px,${rect.top-final.top+(rect.height-final.height)/2}px) scale(${rect.width/final.width},${rect.height/final.height})`};
    const dest = target.getBoundingClientRect();
    await animateTo(carrier,[frame,{transform:`translate(${dest.left-final.left+(dest.width-final.width)/2}px,${dest.top-final.top+(dest.height-final.height)/2}px) scale(${dest.width/final.width},${dest.height/final.height})`}],450,"ease-out");
  } else await travel(target.getBoundingClientRect(),true,target.src);
  rack.querySelectorAll(".lifted").forEach(el => el.classList.remove("lifted"));
  detailOpen = busy = false;
  panel.classList.remove("returning","focus-panel");
  panel.close();
}

async function turnFace(side) {
  if (busy || side === face) return;
  busy = true;
  const session = detailSession;
  const image = byId("detail-image"), rotor = byId("rotor");
  const other = new Image();
  other.alt = "";
  other.className = "outgoing-face";
  other.src = image.src;
  rotor.append(other);
  image.src = fabric(selected,side);
  image.alt = `${shirts[selected].name}, ${side}`;
  face = side;
  panelBody.querySelectorAll("[data-view]").forEach(control => control.setAttribute("aria-pressed", String(control.dataset.view === side)));
  const options = [{transform:"perspective(900px) rotateY(0deg)"},{transform:"perspective(900px) rotateY(180deg)"}];
  image.classList.add("reverse-face");
  await animateTo(rotor,options,500,"ease-in-out");
  image.classList.remove("reverse-face");
  other.remove();
  if (session === detailSession) busy = false;
}

async function cycleShirt(direction) {
  if (!detailOpen || busy) return;
  busy = true;
  const session = detailSession;
  const transform = (x,angle) => `translateX(${x}vw) perspective(900px) rotateY(${angle}deg)`;
  await animateTo(byId("carrier"),springFrames(140,22,330,p => ({transform:transform(-35*direction*p,-90*direction*p)})),330);
  if (session !== detailSession) return;
  rack.children[selected].classList.remove("lifted");
  const next = wrap(selected+direction);
  showShirt(next,rack.children[next],true);
  const newSession = detailSession;
  byId("panel-body").querySelector(`[data-step="${direction}"]`).focus({preventScroll:true});
  const incoming = springFrames(140,22,550,(p,s) => ({
    transform:transform(35*direction*(1-p),90*direction*(1-p))+` rotateZ(${s}deg)`
  }));
  await animateTo(byId("carrier"),incoming,550);
  if (newSession === detailSession) busy = false;
}

async function dyeColour(colour) {
  if (busy || colour === colourChoice[selected]) return;
  busy = true;
  const session = detailSession;
  const dye = new Image();
  dye.className = "dye";
  dye.alt = "";
  dye.src = fabric(selected,face,colour);
  try {
    await dye.decode();
    if (session !== detailSession) return;
    byId("rotor").append(dye);
    const frames = Array.from({length:49},(_,i) => {
      const t = i/48;
      const p = t < .5 ? 2*t*t : 1-2*(1-t)**2;
      const line = Array.from({length:41},(_,j) => {
        const x = j*2.5;
        const wave = Math.sin(x/9 + t*6) + .35*Math.sin(x/3.7-t*8);
        return `${x}% ${107-122*p+wave*2.6*(1-.6*p)}%`;
      });
      return {clipPath:`polygon(0 110%,${line.join(",")},100% 110%)`};
    });
    await animateTo(dye,frames,1150);
    if (session !== detailSession) return;
    colourChoice[selected] = colour;
    byId("detail-image").src = dye.src;
    const piece = rack.children[selected];
    piece.querySelector(".rack-front").src = fabric(selected,"front");
    piece.querySelector(".rack-rest").src = fabric(selected,piece.dataset.rest);
    panelBody.querySelectorAll("[data-colour]").forEach(tag => tag.setAttribute("aria-pressed",String(Number(tag.dataset.colour) === colour)));
  } finally {
    dye.remove();
    if (session === detailSession) busy = false;
  }
}

byId("close").addEventListener("click",closePanel);
panel.addEventListener("cancel",event => {event.preventDefault(); closePanel();});
panel.addEventListener("close", () => restoreFocus?.focus({preventScroll:true}));
panel.addEventListener("click", event => {
  if (event.target === panel) {
    const rect = panel.getBoundingClientRect();
    if (detailOpen || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePanel();
    return;
  }
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.shirt !== undefined) showShirt(Number(button.dataset.shirt), button);
  if (button.dataset.view) turnFace(button.dataset.view);
  if (button.dataset.step) cycleShirt(Number(button.dataset.step));
  if (button.dataset.colour !== undefined) dyeColour(Number(button.dataset.colour));
});

let detailTouch;
panel.addEventListener("pointerdown",event => {
  detailTouch = event.target.closest(".product-photo") && !event.target.closest("button") ? {x:event.clientX,y:event.clientY} : null;
  if (detailTouch) event.target.closest(".product-photo").setPointerCapture(event.pointerId);
});
panel.addEventListener("pointerup",event => {
  if (!detailTouch) return;
  const dx = event.clientX-detailTouch.x;
  if (Math.abs(dx)>50 && Math.abs(dx)>Math.abs(event.clientY-detailTouch.y)) cycleShirt(dx<0 ? 1 : -1);
  detailTouch = null;
});
panel.addEventListener("pointercancel",() => {detailTouch=null;});
document.addEventListener("keydown", event => {
  if (event.altKey || event.metaKey || event.ctrlKey) return;
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  if (panel.open) {
    if (detailOpen) {event.preventDefault(); cycleShirt(event.key === "ArrowLeft" ? -1 : 1);}
    return;
  }
  event.preventDefault();
  const follow = rack.contains(document.activeElement);
  select(selected + (event.key === "ArrowLeft" ? -1 : 1));
  if (follow) rack.children[selected].focus({preventScroll:true});
});

let gesture;
let suppressClick = false;
stage.addEventListener("pointerdown", event => {
  if (!event.isPrimary || event.button !== 0) return;
  suppressClick = false;
  gesture = {pointer: event.pointerId, start: event.clientX, dragged: false, button: event.target.closest(".piece")};
});
stage.addEventListener("pointermove", event => {
  if (gesture?.pointer !== event.pointerId) return;
  const distance = event.clientX - gesture.start;
  if (!gesture.dragged && Math.abs(distance) < 8) return;
  gesture.dragged = true;
  stage.setPointerCapture(event.pointerId);
  stage.classList.add("is-dragging");
  stage.style.setProperty("--drag", `${Math.max(-100, Math.min(100, distance * .55))}px`);
});
function endGesture(event) {
  if (gesture?.pointer !== event.pointerId) return;
  const distance = event.clientX - gesture.start;
  suppressClick = gesture.dragged;
  if (gesture.dragged && event.type === "pointerup" && Math.abs(distance) >= 24) {
    select(selected - Math.sign(distance));
  }
  if (event.type === "pointerup" && event.pointerType === "touch" && !gesture.dragged && gesture.button && !panel.open) {
    const index = Array.from(rack.children).indexOf(gesture.button);
    if (index >= 0) {
      event.preventDefault();
      suppressClick = true;
      showShirt(index, gesture.button);
    }
  }
  stage.classList.remove("is-dragging");
  stage.style.removeProperty("--drag");
  gesture = undefined;
}
window.addEventListener("pointerup", endGesture);
window.addEventListener("pointercancel", endGesture);
stage.addEventListener("click", event => {
  if (suppressClick && event.detail !== 0) {
    event.stopPropagation();
    suppressClick = false;
  }
}, true);

const ticker = document.querySelector(".ticker");
const phrase = "<span>BLEED WORLDWIDE</span><span>EST. 2026</span><span>MADE WITH LOVE</span>";
ticker.innerHTML = (`<div class="ticker-group">${phrase.repeat(6)}</div>`).repeat(2);
