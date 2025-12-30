const logEl = document.getElementById("log");
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
const SCALE = 2; // scale up for visibility
canvas.style.width = canvas.width * SCALE + "px";
canvas.style.height = canvas.height * SCALE + "px";
ctx.scale(1, 1);

function log(msg) {
  logEl.innerText = msg + "\n" + logEl.innerText;
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
      ctx.fillStyle = "#000"; // Typical for this UI
      ctx.font = "bold 16px monospace"; // Closer to the '6x8:2' font
      ctx.textAlign = "center";
      ctx.fillText(o.text, o.x, o.y);
      break;
    case "drawString":
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(o.text, o.x, o.y);
      break;
    case "drawImage":
      // not implementing full image decoder; show placeholder
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
