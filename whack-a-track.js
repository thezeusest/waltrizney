/* Whack-a-Track mini-game for the Rizney YouTube player. */
(() => {
  "use strict";
  const TRACK_HEALTH = 24;
  const GAME_DURATION = 80;
  const MOLE_VISIBLE_MS = 460;
  const MOLE_INTERVAL_MS = 1400;
  const youtube = () => window.rizneyPlayer || window.player || null;
  let game;
  let active = false;
  let trackHealth = TRACK_HEALTH;
  let secondsLeft = GAME_DURATION;
  let moleTimer;
  let hideTimer;
  let gameTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const playing = () => {
    const player = youtube();
    return player && typeof player.getPlayerState === "function" && window.YT &&
      player.getPlayerState() === YT.PlayerState.PLAYING;
  };

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

    Object.assign(panel.style, {
      position: "sticky", top: "104px", zIndex: "20", maxWidth: "min(92vw, 620px)",
      boxSizing: "border-box", margin: "8px auto 18px", padding: "10px 14px 14px",
      textAlign: "center", background: "#120b18", border: "2px solid #d4af37",
      borderRadius: "12px", boxShadow: "0 0 24px rgba(212,175,55,.35)"
    });
    Object.assign($("h2", panel).style, { margin: "0 0 6px" });
    Object.assign($("#wat-status", panel).style, { margin: "0 0 4px", minHeight: "1.4em" });
    Object.assign($("#wat-time", panel).parentElement.style, { margin: "0 0 8px" });
    Object.assign($("#wat-health", panel).style, {
      display: "block", width: "100%", height: "18px", margin: "8px 0 14px", accentColor: "#d4af37"
    });

    const board = $("#wat-board", panel);
    Object.assign(board.style, { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", margin: "18px auto" });
    for (let i = 0; i < 6; i++) {
      const hole = document.createElement("button");
      hole.type = "button";
      hole.className = "wat-hole";
      hole.textContent = "🕳️";
      hole.dataset.active = "false";
      Object.assign(hole.style, { minHeight: "76px", padding: "8px", fontSize: "2rem", cursor: "crosshair" });
      hole.addEventListener("click", () => {
        if (!active || hole.dataset.active !== "true") return;
        hole.dataset.active = "false";
        hole.textContent = "💥";
        trackHealth--;
        $("#wat-health", panel).value = trackHealth;
        if (trackHealth <= 0) finish(true);
      });
      board.appendChild(hole);
    }

    $("#wat-close", panel).addEventListener("click", closeGame);
    $("#wat-refresh", panel).addEventListener("click", () => window.location.reload());
    (document.querySelector(".player-dock") || $("main") || document.body)
      .insertAdjacentElement("afterend", panel);
    panel.hidden = true;
    game = { panel, board, status: $("#wat-status", panel) };
    return game;
  }

  function hideMoles() {
    game.board.querySelectorAll(".wat-hole").forEach(hole => {
      hole.dataset.active = "false";
      hole.textContent = "🕳️";
    });
  }

  function spawnMole() {
    if (!active) return;
    const holes = [...game.board.querySelectorAll(".wat-hole")];
    const hole = holes[Math.floor(Math.random() * holes.length)];
    hideMoles();
    hole.dataset.active = "true";
    hole.textContent = "🐭";
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (hole.dataset.active === "true") hole.textContent = "🕳️";
      hole.dataset.active = "false";
    }, MOLE_VISIBLE_MS);
    moleTimer = setTimeout(spawnMole, MOLE_INTERVAL_MS);
  }

  function startClock() {
    clearInterval(gameTimer);
    secondsLeft = GAME_DURATION;
    $("#wat-time", game.panel).textContent = secondsLeft;
    gameTimer = setInterval(() => {
      if (!active) return;
      secondsLeft--;
      $("#wat-time", game.panel).textContent = secondsLeft;
      if (secondsLeft <= 0) finish(false);
    }, 1000);
  }

  function dramaticWin() {
    const burst = document.createElement("div");
    burst.setAttribute("role", "status");
    burst.innerHTML = `<strong>💥 TRACK DESTROYED! 💥</strong><span>Congratulations, you obliterated that song!</span>`;
    Object.assign(burst.style, {
      position: "fixed", inset: "0", zIndex: "100", display: "grid", placeContent: "center",
      gap: "16px", padding: "24px", textAlign: "center", color: "#f5d76e",
      background: "radial-gradient(circle, rgba(192,132,252,.35), rgba(0,0,0,.94) 65%)",
      fontSize: "clamp(1.4rem, 5vw, 3.2rem)", textShadow: "0 0 18px #d4af37",
      animation: "wat-win .35s ease-out"
    });
    burst.querySelector("span").style.fontSize = "clamp(1rem, 3vw, 1.5rem)";
    const style = document.createElement("style");
    style.textContent = `@keyframes wat-win{from{opacity:0;transform:scale(.65)}to{opacity:1;transform:scale(1)}}`;
    document.head.appendChild(style);
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 1900);
  }

  // Remove the defeated song from the visible collection, then play the next card.
  // The song rows are kept in the same order as the internal player collection.
  function removeDefeatedTrackAndAdvance() {
    const rows = [...document.querySelectorAll("#song-list .song")];
    const now = $("#now-playing")?.textContent || "";
    const match = now.match(/Song\s+(\d+)/i);
    const defeatedPosition = match ? Number(match[1]) - 1 : -1;
    const defeatedRow = defeatedPosition >= 0 ? rows[defeatedPosition] : null;
    if (!defeatedRow) return;

    defeatedRow.remove();
    const remaining = [...document.querySelectorAll("#song-list .song")];
    const nextRow = remaining[defeatedPosition] || remaining[defeatedPosition - 1];
    if (nextRow) nextRow.querySelector(".play")?.click();
    else $("#now-playing").textContent = "You destroyed the entire collection ✦";
  }

  function startGame(event) {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    game = createGame();
    clearTimeout(moleTimer);
    clearTimeout(hideTimer);
    clearInterval(gameTimer);
    $("#wat-refresh", game.panel).hidden = true;

    if (!playing()) {
      active = false;
      game.status.textContent = "Play a track to start the game, then pause it to remove from playlist";
      game.panel.hidden = false;
      game.panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    trackHealth = TRACK_HEALTH;
    active = true;
    game.panel.hidden = false;
    $("#wat-health", game.panel).value = trackHealth;
    hideMoles();
    game.status.textContent = "Whack every mouse before the clock runs out!";
    startClock();
    spawnMole();
    game.panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function finish(won) {
    if (!active) return;
    active = false;
    clearTimeout(moleTimer);
    clearTimeout(hideTimer);
    clearInterval(gameTimer);
    hideMoles();
    if (won) {
      game.status.textContent = "💥 TRACK WHACKED! Removing it from the playlist…";
      dramaticWin();
      removeDefeatedTrackAndAdvance();
    } else {
      game.status.textContent = "The track survived. Try again!";
    }
  }

  function closeGame() {
    active = false;
    clearTimeout(moleTimer);
    clearTimeout(hideTimer);
    clearInterval(gameTimer);
    if (game) {
      hideMoles();
      game.panel.hidden = true;
    }
  }

  function init() {
    const button = document.querySelector("#whack-track");
    if (!button || button.dataset.whackGameBound === "true") return;
    button.dataset.whackGameBound = "true";
    Object.assign(button.style, { cursor: "pointer" });
    button.addEventListener("click", startGame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
