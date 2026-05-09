const SIZES = [16, 32, 48, 128];

function drawIcon(canvas, size) {
  const ctx = canvas.getContext("2d");
  canvas.width  = size;
  canvas.height = size;

  const r = size * 0.22;

  ctx.fillStyle = "#1c1c1e";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();

  const grd = ctx.createRadialGradient(
    size * 0.5, size * 0.35, 0,
    size * 0.5, size * 0.35, size * 0.6
  );
  grd.addColorStop(0, "rgba(10,132,255,0.12)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();

  const cx   = size * 0.5;
  const cy   = size * 0.48;
  const dotR = size * 0.28;

  ctx.fillStyle = "#0a84ff";
  ctx.beginPath();
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle    = "#ffffff";
  ctx.font         = `600 ${Math.round(size * 0.3)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("L", cx, cy + size * 0.01);
}

const container = document.getElementById("canvases");

SIZES.forEach(size => {
  const wrap   = document.createElement("div");
  wrap.className = "icon-wrap";
  const canvas = document.createElement("canvas");
  drawIcon(canvas, size);
  const label  = document.createElement("span");
  label.textContent = `${size}×${size}`;
  wrap.appendChild(canvas);
  wrap.appendChild(label);
  container.appendChild(wrap);
});

document.getElementById("downloadAll").addEventListener("click", () => {
  const canvases = container.querySelectorAll("canvas");
  canvases.forEach((canvas, i) => {
    const a    = document.createElement("a");
    a.href     = canvas.toDataURL("image/png");
    a.download = `icon${SIZES[i]}.png`;
    a.click();
  });
});
