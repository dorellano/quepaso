// gameEngine.js - EL MOTOR VISUAL REFORZADO
const API_URL = 'https://quepaso.vercel.app/api/game';
let _user = null;

// 1. Inyectamos el diseño para que el juego sea grande y centrado
const style = document.createElement('style');
style.innerHTML = `
  #game-modal-container {
    position: fixed !important;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 999999999 !important; /* Por encima de todo */
    font-family: sans-serif;
  }
  .game-card {
    background: #fff;
    padding: 25px;
    border-radius: 20px;
    width: 90%;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    border: 3px solid #ffcc00;
  }
  .game-card h2 { color: #333; margin-top: 0; }
  .scratch-area {
    width: 250px; height: 150px;
    background: #ccc; margin: 20px auto;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: bold; cursor: pointer;
    border-radius: 10px; border: 2px dashed #666;
  }
  .close-btn { margin-top: 15px; color: #666; cursor: pointer; text-decoration: underline; }
`;
document.head.appendChild(style);

export async function identifyUser(email, name) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'identify', email, name })
  });
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

function showScratchGame(noteId, noteTitle, onWin) {
  const container = document.createElement('div');
  container.id = 'game-modal-container';
  container.innerHTML = `
    <div class="game-card">
      <h2>¡LECTOR PREMIADO! 🎁</h2>
      <p>Llegaste al final de la nota. ¡Raspá y descubrí tu premio!</p>
      <div class="scratch-area" id="scratch-box">HACÉ CLIC AQUÍ</div>
      <div class="close-btn" id="close-game">Cerrar y seguir leyendo</div>
    </div>
  `;
  document.body.appendChild(container);

  // Al hacer clic en el área, simulamos que ganó (luego pondremos la raspadita real)
  document.getElementById('scratch-box').onclick = async () => {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'noteRead', userId: _user.id, noteId, noteTitle })
    });
    const data = await res.json();
    document.getElementById('scratch-box').innerHTML = "¡GANASTE +30 XP!";
    setTimeout(() => {
      container.remove();
      onWin(data.xpGained, data.streak);
    }, 2000);
  };

  document.getElementById('close-game').onclick = () => container.remove();
}
