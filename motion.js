"use strict";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

// Sample the reference's damped springs at 120 Hz; the browser interpolates frames.
function springFrames(stiffness, damping, duration, frame, kick = 0) {
  const steps = Math.ceil(duration * .12);
  const dt = duration / steps / 1000;
  let value = 0, velocity = 0, swing = 0, swingVelocity = kick;
  const frames = [frame(0, 0)];
  for (let i = 1; i < steps; i++) {
    velocity += ((1 - value) * stiffness - damping * velocity) * dt;
    value += velocity * dt;
    swingVelocity += (-90 * swing - 5 * swingVelocity + 3.6 * velocity) * dt;
    swing += swingVelocity * dt;
    frames.push(frame(value, swing));
  }
  frames.push(frame(1, 0));
  return frames;
}

function animateTo(element, frames, duration, easing = "linear") {
  if (reducedMotion.matches) return Promise.resolve();
  const animation = element.animate(frames, {duration, easing});
  return animation.finished.catch(() => {});
}

function rackMotion(stage, buttons) {
  const slides = Array.from(buttons, button => ({
    button, pivot: button.querySelector(".pivot"), cloth: button.querySelector(".cloth"),
    turn: 0, velocity: 0, swing: 0, kick: 0, gap: 0, gapVelocity: 0, scale: 1, scaleVelocity: 0
  }));
  let active = -1, direction = 1, handle = 0, previousTime = 0;
  function draw(time) {
    const dt = Math.min(.032, (time - previousTime) / 1000);
    previousTime = time;
    let moving = false;
    const slot = i => Number(slides[i].button.style.getPropertyValue("--offset"));
    for (const [i, item] of slides.entries()) {
      const focus = active === i;
      const delta = active < 0 ? 0 : slot(i) - slot(active);
      const gap = delta ? .25 * Math.sign(delta) * .55 ** (Math.abs(delta) - 1) : 0;
      const turn = focus ? 180 : 0, scale = focus ? 1.12 : 1;
      item.velocity += ((turn - item.turn) * 120 - 14 * item.velocity) * dt;
      item.turn += item.velocity * dt;
      item.kick += (-90 * item.swing - 5 * item.kick + .02 * item.velocity) * dt;
      item.swing += item.kick * dt;
      item.gapVelocity += ((gap - item.gap) * 170 - 22 * item.gapVelocity) * dt;
      item.gap += item.gapVelocity * dt;
      item.scaleVelocity += ((scale - item.scale) * 210 - 20 * item.scaleVelocity) * dt;
      item.scale += item.scaleVelocity * dt;
      const settled = reducedMotion.matches || (Math.abs(turn-item.turn) < .05 && Math.abs(item.velocity) < .5 && Math.abs(item.swing) < .03 && Math.abs(item.kick) < .05 && Math.abs(item.gap-gap) < .0005 && Math.abs(item.gapVelocity) < .005 && Math.abs(scale-item.scale) < .001 && Math.abs(item.scaleVelocity) < .005);
      if (settled) Object.assign(item,{turn, scale, gap, velocity:0, swing:0, kick:0, gapVelocity:0, scaleVelocity:0});
      else moving = true;
      const showingFront = item.turn > 90;
      // The uploads have two faces. Angle the resting one to reproduce the side-on rack.
      const angle = showingFront ? item.turn - 180 : 35 + item.turn * (55/90);
      item.pivot.style.transform = `translateX(${item.gap*100}%) perspective(900px) rotateZ(${item.swing}deg) rotateY(${angle}deg)`;
      item.cloth.style.transform = `scale(${item.scale})`;
      item.button.classList.toggle("turned",showingFront);
    }
    handle = moving ? requestAnimationFrame(draw) : 0;
  }
  function wake() {
    if (handle) return;
    previousTime = performance.now();
    draw(previousTime);
  }
  function target(index) {
    if (active === index) return;
    if (active >= 0) slides[active].kick = -direction * 16;
    if (index >= 0) slides[index].kick = -direction * 26;
    active = index;
    slides.forEach(({button},i) => button.classList.toggle("hovered",i === index));
    wake();
  }
  stage.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || event.buttons || panel.open) return;
    if (event.movementX) direction = Math.sign(event.movementX);
    const button = event.target.closest(".piece");
    target(button ? slides.findIndex(item => item.button === button) : -1);
  });
  stage.addEventListener("pointerleave", () => target(-1));
  stage.addEventListener("pointerdown", e => { if(e.pointerType === "touch") target(-1); });
  stage.addEventListener("focusin", e => {
    if (e.target.matches(".piece:focus-visible")) target(slides.findIndex(item => item.button === e.target));
  });
  stage.addEventListener("focusout", () => target(-1));
  reducedMotion.addEventListener("change", wake);
  wake();
  return () => target(-1);
}
