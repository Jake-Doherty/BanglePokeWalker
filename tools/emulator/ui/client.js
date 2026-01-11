const logEl = document.getElementById("log");
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
const SCALE = 2; // scale up for visibility
canvas.style.width = canvas.width * SCALE + "px";
canvas.style.height = canvas.height * SCALE + "px";
ctx.scale(1, 1);

function fontToCss(f, bold) {
  // f may be an object {name,size} or a simple string/number
  let name = "";
  let size = 2;
  if (!f) {
    name = "6x8";
    size = 2;
  } else if (typeof f === "object") {
    name = f.name || "6x8";
    size = f.size || 1;
  } else if (typeof f === "string") {
    name = f;
    size = 1;
  } else if (typeof f === "number") {
    name = "6x8";
    size = f;
  }
  name = String(name).toLowerCase();
  let base = 10;
  if (name.indexOf("6x8") !== -1) base = 6;
  else if (name.indexOf("4x6") !== -1) base = 4;
  else if (name.indexOf("12x20") !== -1) base = 12;
  const px = Math.max(6, Math.round(base * (size || 1)));
  return (bold ? "bold " : "") + px + "px monospace";
}

function log(msg) {
  logEl.innerText = msg + "\n" + logEl.innerText;
}

function drawTextBitmap(o, center) {
  const txt = String(o.text || "");
  const fontCss = fontToCss(o.font, center);
  // Offscreen canvas for crisp rendering; treat as bitmap by disabling smoothing
  const tmp = document.createElement("canvas");
  const tctx = tmp.getContext("2d");
  tctx.imageSmoothingEnabled = false;
  tctx.font = fontCss;
  // Estimate width/height
  const metrics = tctx.measureText(txt);
  const px = Math.max(
    6,
    parseInt((fontCss.match(/(\d+)px/) || [0, 10])[1], 10)
  );
  const w = Math.max(1, Math.ceil(metrics.width));
  const h = Math.max(px + 2, Math.ceil(px * 1.2));
  tmp.width = w;
  tmp.height = h;
  // reapply settings after resize
  const ctx2 = tmp.getContext("2d");
  ctx2.imageSmoothingEnabled = false;
  ctx2.font = fontCss;
  ctx2.fillStyle = o.color || "#000";
  ctx2.textBaseline = center ? "middle" : "top";
  const drawY = center ? h / 2 : 0;
  const drawX = center ? w / 2 : 0;
  ctx2.textAlign = center ? "center" : "left";
  ctx2.fillText(txt, drawX, drawY);

  // Copy to main canvas (no scaling) — coordinates expected to be integer
  const destX = Math.floor(o.x || 0) - (center ? Math.floor(w / 2) : 0);
  const destY = Math.floor(o.y || 0) - (center ? Math.floor(h / 2) : 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, destX, destY);
}

const evt = new EventSource("/events");
evt.onmessage = (m) => {
  try {
    const obj = JSON.parse(m.data);
    handleCmd(obj);
  } catch (e) {
    console.error(e);
  }
};

function handleCmd(o) {
  switch (o.cmd) {
    case "clear":
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      break;
    case "fillRect":
      ctx.fillStyle = o.color || "#fff"; // Use the color sent by the server
      ctx.fillRect(o.x1, o.y1, o.x2 - o.x1 + 1, o.y2 - o.y1 + 1);
      break;
    case "centerString":
      drawTextBitmap(o, true);
      break;
    case "drawString":
      drawTextBitmap(o, false);
      break;
    case "drawImage":
      // If server sent an SVG image payload, draw it via an Image element
      if (
        o.img &&
        typeof o.img === "object" &&
        o.img.type === "svg" &&
        o.img.svg
      ) {
        const img = new Image();
        img.onload = function () {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, o.x || 0, o.y || 0);
        };
        img.onerror = function (e) {
          console.error("SVG draw error", e);
        };
        img.src =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(o.img.svg);
        break;
      }
      // not implementing full image decoder; show placeholder for other types
      ctx.fillStyle = "#6cf";
      ctx.fillRect(o.x, o.y, 16, 16);
      break;
    case "lcd":
      log("LCD " + (o.on ? "ON" : "OFF"));
      break;
    case "buzz":
      log("BUZZ " + JSON.stringify(o));
      break;
    case "flip":
      // nothing special for flip in canvas
      break;
    case "input":
      // Highlight button feedback on input
      if (o.type === "button") highlightButton(o.btn);
      if (o.type === "touch") highlightTouch(o.x, o.y);
      break;
    default:
      console.log("UI unknown cmd", o);
  }
}

function sendInput(obj) {
  fetch("/input", { method: "POST", body: JSON.stringify(obj) });
}

document
  .getElementById("leftBtn")
  .addEventListener("click", () => sendInput({ type: "button", btn: "LEFT" }));
document
  .getElementById("centerBtn")
  .addEventListener("click", () =>
    sendInput({ type: "button", btn: "CENTER" })
  );
document
  .getElementById("rightBtn")
  .addEventListener("click", () => sendInput({ type: "button", btn: "RIGHT" }));

canvas.addEventListener("click", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((ev.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.floor((ev.clientY - rect.top) * (canvas.height / rect.height));
  sendInput({ type: "touch", x, y });
});

// Visual feedback helpers
const leftBtn = document.getElementById("leftBtn");
const centerBtn = document.getElementById("centerBtn");
const rightBtn = document.getElementById("rightBtn");
function highlightButton(name) {
  const el =
    name === "LEFT" ? leftBtn : name === "RIGHT" ? rightBtn : centerBtn;
  if (!el) return;
  el.style.transition = "background 0.12s";
  const orig = el.style.background;
  el.style.background = "#4caf50";
  setTimeout(() => (el.style.background = orig), 120);
}

function highlightTouch(x, y) {
  // briefly draw a circle on canvas where the touch occurred
  ctx.save();
  ctx.fillStyle = "rgba(255,255,0,0.6)";
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  setTimeout(() => {
    ctx.clearRect(x - 8, y - 8, 16, 16);
  }, 120);
  ctx.restore();
}
