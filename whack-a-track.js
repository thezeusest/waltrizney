/* Whack-a-Track mini-game for the Rizney YouTube player. */
(() => {
  "use strict";
  const TRACK_HEALTH = 24, GAME_DURATION = 80, MOLE_VISIBLE_MS = 460, MOLE_INTERVAL_MS = 1400;
  const youtube = () => window.rizneyPlayer || window.player || null;
  let game, active = false, trackHealth = TRACK_HEALTH, secondsLeft = GAME_DURATION;
  let moleTimer, hideTimer, gameTimer;
  const $ = (selector, root = document) => root.querySelector(selector);
  const playing = () => { const player = youtube(); return player && typeof player.getPlayerState === "function" && window.YT && player.getPlayerState() === YT.PlayerState.PLAYING; };

  function createGame() {
    if (game) return game;
    const panel = document.createElement("section");
    panel.id = "whack-a-track-game";
    panel.setAttribute("aria-label", "Whack-a-Track");
    panel.innerHTML = `
      <h2>Whack-a-Track</h2>
      <p id="wat-status" aria-live="polite"></p>
      <p><span id="wat-time">${GAME_DURATION}</span>s</p>
      <progress id="wat-health" max="${TRACK_HEALTH}" value="${TRACK_HEALTH}" aria-label="Track health"></progress>
      <div id="wat-board" role="group" aria-label="Whack-a-Track board"></div>
      <button id="wat-refresh" type="button" hidden>Refresh playlist</button>
      <button id="wat-close" type="button">Close game</button>`;
    Object.assign(panel.style, { position:"sticky", top:"104px", zIndex:"20", maxWidth:"min(92vw, 620px)", boxSizing:"border-box", margin:"8px auto 18px", padding:"10px 14px 14px", textAlign:"center", color:"#e0aaff", background:"#12001f", border:"1px solid #7b2cbf", borderRadius:"12px", boxShadow:"0 8px 24px rgba(0,0,0,.35)" });
    Object.assign($("h2", panel).style, { margin:"0 0 6px" });
    Object.assign($("#wat-status", panel).style, { margin:"0 0 4px" });
    Object.assign($("#wat-time", panel).parentElement.style, { margin:"0 0 8px" });
    Object.assign($("#wat-health", panel).style, { display:"block", width:"100%", height:"18px", margin:"8px 0 14px", accentColor:"#d4af37" });
    const board = $("#wat-board", panel);
    Object.assign(board.style, { display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:"10px", margin:"18px auto" });
    for (let i = 0; i < 6; i++) {
      const hole = document.createElement("button");
      hole.type = "button"; hole.className = "wat-hole"; hole.textContent = "🕳️"; hole.dataset.active = "false";
      Object.assign(hole.style, { minHeight:"76px", padding:"8px", fontSize:"2rem" });
      hole.addEventListener("click", () => { if (!active || hole.dataset.active !== "true") return; hole.dataset.active="false"; hole.textContent="💥"; trackHealth--; $("#wat-health", panel).value=trackHealth; if (trackHealth <= 0) finish(true); });
      board.appendChild(hole);
    }
    $("#wat-close", panel).addEventListener("click", closeGame);
    $("#wat-refresh", panel).addEventListener("click", () => window.location.reload());
    (document.querySelector(".player-dock") || $("main") || document.body).insertAdjacentElement("afterend", panel);
    panel.hidden = true; game = { panel, board, status: $("#wat-status", panel) }; return game;
  }
  function hideMoles() { game.board.querySelectorAll(".wat-hole").forEach(hole => { hole.dataset.active="false"; hole.textContent="🕳️"; }); }
  function spawnMole() {
    if (!active) return;
    const holes = [...game.board.querySelectorAll(".wat-hole")], hole = holes[Math.floor(Math.random() * holes.length)];
    hideMoles(); hole.dataset.active="true"; hole.textContent="🐭"; clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (hole.dataset.active === "true") hole.textContent="🕳️"; hole.dataset.active="false"; }, MOLE_VISIBLE_MS);
    moleTimer = setTimeout(spawnMole, MOLE_INTERVAL_MS);
  }
  function startClock() { clearInterval(gameTimer); secondsLeft=GAME_DURATION; $("#wat-time", game.panel).textContent=secondsLeft; gameTimer=setInterval(() => { if (!active) return; secondsLeft--; $("#wat-time", game.panel).textContent=secondsLeft; if (secondsLeft <= 0) finish(false); }, 1000); spawnMole(); }
  function startGame(event) {
    event?.preventDefault(); event?.stopImmediatePropagation(); game=createGame(); clearTimeout(moleTimer); clearTimeout(hideTimer); clearInterval(gameTimer); $("#wat-refresh", game.panel).hidden=true; game.status.textContent="";
    if (!playing()) { active=false; game.status.textContent="Play a track to start the game, then pause it to remove from playlist"; game.panel.hidden=false; game.panel.scrollIntoView({ behavior:"smooth", block:"nearest" }); return; }
    trackHealth=TRACK_HEALTH; active=true; game.panel.hidden=false; $("#wat-health", game.panel).value=trackHealth; hideMoles(); startClock(); game.panel.scrollIntoView({ behavior:"smooth", block:"nearest" });
  }
  function finish(won) { if (!active) return; active=false; clearTimeout(moleTimer); clearTimeout(hideTimer); clearInterval(gameTimer); hideMoles(); game.status.textContent=won ? "💥 TRACK WHACKED! Nice work." : "The track escaped. Try again!"; $("#wat-refresh", game.panel).hidden=false; }
  function closeGame() { active=false; clearTimeout(moleTimer); clearTimeout(hideTimer); clearInterval(gameTimer); if (game) { hideMoles(); game.panel.hidden=true; } }
  function init() { const button=document.querySelector("#whack-track"); if (!button || button.dataset.whackGameBound === "true") return; button.dataset.whackGameBound="true"; Object.assign(button.style, { cursor:"pointer" }); button.addEventListener("click", startGame); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true }); else init();
})();
