// gameEngine.js - VERSIÓN "RASPADITA REAL"
const API_URL = 'https://quepaso.vercel.app/api/game';
let _user = null;

// Inyectamos el diseño profesional
const style = document.createElement('style');
style.innerHTML = `
  #game-modal-container {
    position: fixed !important; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center;
    z-index: 999999999 !important; font-family: 'Helvetica', sans-serif;
  }
  .game-card {
    background: #fff; padding: 20px; border-radius: 15px; width: 90%; max-width: 350px;
    text-align: center; position: relative; border: 4px solid #ffcc00;
  }
  .scratch-container {
    position: relative; width: 200px; height: 100px; margin: 20px auto;
    background: #eee; border-radius: 10px; overflow: hidden;
  }
  #scratch-canvas {
    position: absolute; top: 0; left: 0; cursor: crosshair; touch-action: none;
  }
  .prize-behind {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: bold; color: #333;
  }
  .btn-continuar {
    display: none; margin-top: 15px; background: #28a745; color: #fff;
    padding: 10px 20px; border-radius: 5px; cursor: pointer; border: none;
  }
`;
document.head.appendChild(style);

export async function identifyUser(email, name) {
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'identify', email, name }) });
  const data = await res.json();
  _user = data.user;
  return _user;
}

export function initScrollTracker(noteId, noteTitle, onWin) {
  let triggered = false;
  window.addEventListener('scroll', () => {
    const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    if (scrollPercent > 0.8 && !triggered && _user) {
      triggered = true;
      showScratchGame(noteId, noteTitle, onWin);
    }
  });
}

async function showScratchGame(noteId, noteTitle, onWin) {
  // Primero avisamos al servidor que leyó la nota
  await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'noteRead', userId: _user.id, noteId, noteTitle }) });

  // Pedimos el premio de la raspadita
  const prizeRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'scratch', userId: _user.id, noteId }) });
  const prizeData = await prizeRes.json();
  const premio = prizeData.prize ? prizeData.prize.label : "+30 XP";

  const container = document.createElement('div');
  container.id = 'game-modal-container';
  container.innerHTML = `
    <div class="game-card">
      <h3>¡RASPÁ TU PREMIO! 🎁</h3>
      <div class="scratch-container">
        <div class="prize-behind">${premio}</div>
        <canvas id="scratch-canvas" width="200" height="100"></canvas>
      </div>
      <p style="font-size: 12px; color: #666;">Usá tu dedo o mouse para descubrir el premio</p>
      <button id="btn-listo" class="btn-continuar">Aceptar Premio</button>
    </div>
  `;
  document.body.appendChild(container);

  setupScratchCanvas(onWin, prizeData);
}

function setupScratchCanvas(onWin, prizeData) {
  const canvas = document.getElementById('scratch-canvas');
  const ctx = canvas.getContext('2d');
  
  // Capa gris para raspar
  ctx.fillStyle = '#C0C0C0';
  ctx.fillRect(0, 0, 200, 100);
  ctx.fillStyle = '#999';
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("RASPÁ ACÁ", 100, 55);

  let isDrawing = false;
  let clearedPixels = 0;

  function scratch(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();

    clearedPixels++;
    if (clearedPixels > 150) { // Si raspó lo suficiente
      document.getElementById('btn-listo').style.display = 'inline-block';
    }
  }

  canvas.addEventListener('mousedown', () => isDrawing = true);
  canvas.addEventListener('touchstart', () => isDrawing = true);
  window.addEventListener('mouseup', () => isDrawing = false);
  window.addEventListener('touchend', () => isDrawing = false);
  canvas.addEventListener('mousemove', scratch);
  canvas.addEventListener('touchmove', scratch);

  document.getElementById('btn-listo').onclick = () => {
    document.getElementById('game-modal-container').remove();
    onWin(30, 1);
  };
}
