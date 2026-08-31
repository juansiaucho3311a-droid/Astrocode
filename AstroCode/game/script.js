/* ==========================================================
   ASTROCODE
   A ZType-style game: destroy asteroids by typing words.
   Tech stack: HTML5 Canvas + vanilla JavaScript (no libraries).
   ========================================================== */

/* ----------------------------------------------------------
   1. REQUIRED WORD LIST (30 words)
   ---------------------------------------------------------- */
const WORD_LIST = [
  "Code", "Bug", "Loop", "Java", "Python", "Bottleneck", "Object",
  "Python", "HTML", "CSS", "PHP", "Algorithm", "Frontend", "Backend",
  "Paradigm", "Class", "Object", "DDoS Attack", "Software", "Deployment",
  "Feature", "Scrum", "Scalability", "Kanban", "Framework", "Middleware",
  "Agile", "String", "Programming", "Refactoring"
];

/* ----------------------------------------------------------
   2. Asteroid CLASS
   Represents a single asteroid and its associated word.
   ---------------------------------------------------------- */
class Asteroid {
  constructor(word, x, y, speed, radius, targetX, targetY) {
    this.word = word;          // Full word (with its original casing)
    this.typedIndex = 0;       // How many characters have been typed correctly so far
    this.x = x;
    this.y = y;
    this.speed = speed;        // Pixels per second (vertical speed)
    this.radius = radius;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.6; // radians/sec
    this.isSelected = false;
    this.markedForRemoval = false;

    // --- Diagonal movement toward the ship ---
    // A horizontal velocity (vx) is calculated so the asteroid
    // arrives exactly at the ship's position (targetX, targetY)
    // at the same moment its "y" reaches the ship's height.
    const timeToReach = Math.max((targetY - y) / speed, 0.001);
    this.vx = (targetX - x) / timeToReach;
  }

  // Updates position and rotation based on elapsed time (dt in seconds)
  update(dt) {
    this.y += this.speed * dt;
    this.x += this.vx * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  // Has the word been fully typed?
  isComplete() {
    return this.typedIndex >= this.word.length;
  }

  // Draws the asteroid and its word on the canvas
  draw(ctx, asteroidImg) {
    // --- Draw the asteroid (rotating image) ---
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    const size = this.radius * 2;
    ctx.drawImage(asteroidImg, -this.radius, -this.radius, size, size);
    ctx.restore();

    // Glow ring if this asteroid is currently selected
    if (this.isSelected) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(78, 228, 78, 0.8)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#4ee44e";
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    }

    // --- Draw the word (typed part in green, remaining part in white) ---
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.textBaseline = "middle";

    const typedPart = this.word.slice(0, this.typedIndex);
    const restPart = this.word.slice(this.typedIndex);

    const typedWidth = ctx.measureText(typedPart).width;
    const restWidth = ctx.measureText(restPart).width;
    const totalWidth = typedWidth + restWidth;

    const textY = this.y - this.radius - 14;
    let startX = this.x - totalWidth / 2;

    // Semi-transparent backdrop for readability
    ctx.fillStyle = "rgba(3, 4, 12, 0.55)";
    ctx.fillRect(startX - 6, textY - 12, totalWidth + 12, 24);

    ctx.textAlign = "left";
    ctx.fillStyle = "#4ee44e"; // green - correctly typed letters
    ctx.shadowColor = "#4ee44e";
    ctx.shadowBlur = 6;
    ctx.fillText(typedPart, startX, textY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff"; // white - letters left to type
    ctx.fillText(restPart, startX + typedWidth, textY);
  }
}

/* ----------------------------------------------------------
   3. Bullet CLASS
   Laser shot fired from the ship every time a letter is typed
   correctly, traveling toward the targeted asteroid.
   ---------------------------------------------------------- */
class Bullet {
  constructor(x, y, targetX, targetY) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;

    const distance = Math.hypot(targetX - x, targetY - y);
    const speed = 1100; // pixels per second
    this.duration = Math.max(distance / speed, 0.06);
    this.age = 0;
    this.markedForRemoval = false;

    this.angle = Math.atan2(targetY - y, targetX - x);
  }

  update(dt) {
    this.age += dt;
    const t = Math.min(this.age / this.duration, 1);
    this.x = this.startX + (this.targetX - this.startX) * t;
    this.y = this.startY + (this.targetY - this.startY) * t;
    if (t >= 1) this.markedForRemoval = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Bullet trail (gradient)
    const grad = ctx.createLinearGradient(-16, 0, 4, 0);
    grad.addColorStop(0, "rgba(120, 220, 255, 0)");
    grad.addColorStop(1, "rgba(190, 245, 255, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(-16, -1.5, 20, 3);

    // Bright tip of the projectile
    ctx.beginPath();
    ctx.arc(4, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#e8fbff";
    ctx.shadowColor = "#7fe0ff";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }
}

/* ----------------------------------------------------------
   4. ExplosionEffect CLASS
   Simple animation played when an asteroid is destroyed.
   ---------------------------------------------------------- */
class ExplosionEffect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.duration = 0.35; // seconds the animation lasts
  }

  update(dt) {
    this.age += dt;
  }

  isFinished() {
    return this.age >= this.duration;
  }

  draw(ctx, explosionImg) {
    const progress = this.age / this.duration; // 0 -> 1
    const scale = 0.6 + progress * 1.2;         // grows
    const alpha = 1 - progress;                 // fades out
    const size = 90 * scale;

    ctx.save();
    ctx.globalAlpha = Math.max(alpha, 0);
    ctx.drawImage(explosionImg, this.x - size / 2, this.y - size / 2, size, size);
    ctx.restore();
  }
}

/* ----------------------------------------------------------
   5. Game CLASS
   Controls state, the main loop, difficulty and input.
   ---------------------------------------------------------- */
class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // DOM references (HUD and screens)
    this.scoreEl = document.getElementById("score");
    this.levelEl = document.getElementById("level");
    this.livesEl = document.getElementById("lives");
    this.startScreen = document.getElementById("start-screen");
    this.pauseScreen = document.getElementById("pause-screen");
    this.gameOverScreen = document.getElementById("gameover-screen");
    this.finalScoreEl = document.getElementById("finalScore");
    this.pauseBtn = document.getElementById("pauseBtn");

    // Game state
    this.state = "menu"; // 'menu' | 'playing' | 'paused' | 'gameover'
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.destroyedCount = 0;

    // Active entities
    this.asteroids = [];
    this.explosions = [];
    this.bullets = [];
    this.selectedAsteroid = null;

    // Difficulty parameters (adjusted as the level increases)
    this.baseSpeed = 60;        // initial px/sec
    this.spawnInterval = 2200;  // ms between spawns
    this.minSpawnInterval = 650;
    this.spawnTimer = 0;

    // Word queue: sorted from longest to shortest,
    // so the longest (hardest) words appear first.
    this.wordQueue = this.buildWordQueue();
    this.wordQueueIndex = 0;

    this.lastTimestamp = 0;

    this.loadAssets().then(() => this.bindEvents());
  }

  /* --- Resizes the canvas to match the window size --- */
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.shipImg) this.updateShipPosition();
  }

  /* --- Loads the images used by the game --- */
  loadAssets() {
    const loadImage = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img); // Continue even if it fails, so the game isn't blocked
        img.src = src;
      });

    return Promise.all([
      loadImage("assets/asteroid.png"),
      loadImage("assets/explosion.png"),
      loadImage("assets/background.png"),
      loadImage("assets/ship.png")
    ]).then(([asteroidImg, explosionImg, backgroundImg, shipImg]) => {
      this.asteroidImg = asteroidImg;
      this.explosionImg = explosionImg;
      this.backgroundImg = backgroundImg;
      this.shipImg = shipImg;
      this.bgOffset = 0; // for the slow background scroll
      this.shipHitFlash = 0; // remaining time of the hit flash
      this.shipMuzzleFlash = 0; // remaining time of the muzzle flash
      this.updateShipPosition();
    });
  }

  /* --- Calculates where the ship sits (fixed, centered, near the bottom) --- */
  updateShipPosition() {
    this.shipWidth = 70;
    this.shipHeight = 80;
    this.shipX = this.canvas.width / 2;
    this.shipY = this.canvas.height - this.shipHeight / 2 - 24;
    this.shipCollisionRadius = 30; // approximate hull radius used for collisions
  }

  /* --- Builds the word queue sorted from longest to shortest --- */
  buildWordQueue() {
    return [...WORD_LIST].sort((a, b) => b.length - a.length);
  }

  /* --- Wires up buttons and keyboard input --- */
  bindEvents() {
    document.getElementById("startBtn").addEventListener("click", () => this.startGame());
    document.getElementById("restartBtn").addEventListener("click", () => this.startGame());
    document.getElementById("restartFromPauseBtn").addEventListener("click", () => this.startGame());
    document.getElementById("resumeBtn").addEventListener("click", () => this.resumeGame());
    document.getElementById("menuBtn").addEventListener("click", () => this.goToMenu());
    this.pauseBtn.addEventListener("click", () => this.togglePause());
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));

    requestAnimationFrame((t) => this.loop(t));
  }

  /* --- Resets every variable and starts a new run --- */
  startGame() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.destroyedCount = 0;
    this.asteroids = [];
    this.explosions = [];
    this.bullets = [];
    this.selectedAsteroid = null;
    this.spawnInterval = 2200;
    this.spawnTimer = 0;
    this.wordQueue = this.buildWordQueue();
    this.wordQueueIndex = 0;

    this.updateHUD();
    this.startScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.pauseBtn.classList.remove("hidden");
    this.state = "playing";
  }

  /* --- Ends the current run --- */
  endGame() {
    this.state = "gameover";
    this.finalScoreEl.textContent = `Final score: ${this.score}`;
    this.pauseBtn.classList.add("hidden");
    this.gameOverScreen.classList.remove("hidden");
  }

  /* --- Pauses / resumes the run (ESC key or pause button) --- */
  togglePause() {
    if (this.state === "playing") {
      this.pauseGame();
    } else if (this.state === "paused") {
      this.resumeGame();
    }
  }

  pauseGame() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.pauseScreen.classList.remove("hidden");
  }

  resumeGame() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.pauseScreen.classList.add("hidden");
    // Prevents a big dt jump right after resuming
    this.lastTimestamp = 0;
  }

  /* --- Goes back to the main menu from the pause screen --- */
  goToMenu() {
    this.state = "menu";
    this.pauseScreen.classList.add("hidden");
    this.pauseBtn.classList.add("hidden");
    this.asteroids = [];
    this.explosions = [];
    this.bullets = [];
    this.selectedAsteroid = null;
    this.startScreen.classList.remove("hidden");
  }

  /* --- Gets the next word from the queue (cyclic) --- */
  nextWord() {
    const word = this.wordQueue[this.wordQueueIndex % this.wordQueue.length];
    this.wordQueueIndex++;
    return word;
  }

  /* --- Spawns a new asteroid at a random X position --- */
  spawnAsteroid() {
    const word = this.nextWord();
    const margin = 60;
    const x = margin + Math.random() * (this.canvas.width - margin * 2);
    const y = -40;
    const speedVariance = 0.85 + Math.random() * 0.3;
    const speed = this.baseSpeed * speedVariance;
    const radius = 28 + Math.random() * 10;

    // The target is the ship: a small horizontal spread is added
    // so asteroids don't all converge on the exact same point.
    const targetX = this.shipX + (Math.random() * 90 - 45);
    const targetY = this.shipY;

    this.asteroids.push(new Asteroid(word, x, y, speed, radius, targetX, targetY));
  }

  /* --- Levels up: increases speed and spawn frequency --- */
  levelUp() {
    this.level++;
    this.baseSpeed += 9;
    this.spawnInterval = Math.max(this.minSpawnInterval, this.spawnInterval - 150);
    this.updateHUD();
  }

  /* --- Updates the HUD text --- */
  updateHUD() {
    this.scoreEl.textContent = this.score;
    this.levelEl.textContent = this.level;
    this.livesEl.textContent = "❤".repeat(Math.max(this.lives, 0)) || "—";
  }

  /* ------------------------------------------------------------
     KEYBOARD HANDLING
     - If no asteroid is selected, look for one whose word starts
       with the pressed letter (the one closest to the ship wins).
     - If one is already selected, validate the next character.
     ------------------------------------------------------------ */
  handleKeyDown(e) {
    // ESC toggles pause/resume, both while playing and while paused
    if (e.key === "Escape") {
      e.preventDefault();
      this.togglePause();
      return;
    }

    if (this.state !== "playing") return;

    // We only care about single-character keys (letters, space, etc.)
    if (e.key.length !== 1) return;
    e.preventDefault();

    const typedChar = e.key.toLowerCase();

    if (!this.selectedAsteroid) {
      // Find candidates whose first character matches
      const candidates = this.asteroids.filter(
        (a) => a.typedIndex === 0 && a.word[0].toLowerCase() === typedChar
      );
      if (candidates.length === 0) return;

      // Pick the most urgent one: the one closest to the ship
      candidates.sort((a, b) => b.y - a.y);
      const target = candidates[0];

      target.isSelected = true;
      target.typedIndex = 1;
      this.selectedAsteroid = target;
      this.fireBullet(target);

      if (target.isComplete()) {
        this.destroyAsteroid(target);
      }
      return;
    }

    // An asteroid is already selected: validate the next letter
    const asteroid = this.selectedAsteroid;
    const expectedChar = asteroid.word[asteroid.typedIndex]?.toLowerCase();

    if (expectedChar === typedChar) {
      asteroid.typedIndex++;
      this.fireBullet(asteroid);
      if (asteroid.isComplete()) {
        this.destroyAsteroid(asteroid);
      }
    }
    // If the letter doesn't match, it's simply ignored (no penalty, no shot).
  }

  /* --- Fires a projectile from the ship toward an asteroid --- */
  fireBullet(asteroid) {
    const originX = this.shipX;
    const originY = this.shipY - this.shipHeight / 2 + 6; // fired from the "nose"
    this.bullets.push(new Bullet(originX, originY, asteroid.x, asteroid.y));
    this.shipMuzzleFlash = 0.08; // brief muzzle flash
  }

  /* --- Removes an asteroid, adds points and spawns the explosion animation --- */
  destroyAsteroid(asteroid) {
    asteroid.markedForRemoval = true;
    this.explosions.push(new ExplosionEffect(asteroid.x, asteroid.y));

    this.score += asteroid.word.replace(/\s/g, "").length * 10;
    this.destroyedCount++;
    this.selectedAsteroid = null;

    // Every 5 destroyed asteroids, raise the difficulty level
    if (this.destroyedCount % 5 === 0) {
      this.levelUp();
    }

    this.updateHUD();
  }

  /* --- An asteroid hit the ship: lose a life --- */
  loseLife(asteroid) {
    asteroid.markedForRemoval = true;
    if (this.selectedAsteroid === asteroid) {
      this.selectedAsteroid = null;
    }
    this.lives--;
    this.shipHitFlash = 0.35; // brief red flash on the ship
    this.explosions.push(new ExplosionEffect(asteroid.x, this.shipY));
    this.updateHUD();

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  /* ------------------------------------------------------------
     GENERAL UPDATE (called every frame)
     ------------------------------------------------------------ */
  update(dt) {
    if (this.state !== "playing") return;

    // New asteroid spawn control
    this.spawnTimer -= dt * 1000;
    if (this.spawnTimer <= 0) {
      this.spawnAsteroid();
      this.spawnTimer = this.spawnInterval;
    }

    // Update asteroids and detect collision with the ship
    for (const asteroid of this.asteroids) {
      asteroid.update(dt);
      const dx = asteroid.x - this.shipX;
      const dy = asteroid.y - this.shipY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitDistance = asteroid.radius + this.shipCollisionRadius;

      if (!asteroid.markedForRemoval && dist <= hitDistance) {
        this.loseLife(asteroid);
      } else if (!asteroid.markedForRemoval && asteroid.y - asteroid.radius > this.canvas.height) {
        // Safety net: if it somehow slips past, discard it anyway
        this.loseLife(asteroid);
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.markedForRemoval);

    // Update explosions
    for (const exp of this.explosions) exp.update(dt);
    this.explosions = this.explosions.filter((e) => !e.isFinished());

    // Update bullets
    for (const bullet of this.bullets) bullet.update(dt);
    this.bullets = this.bullets.filter((b) => !b.markedForRemoval);

    // Countdown the ship hit-flash timer
    if (this.shipHitFlash > 0) {
      this.shipHitFlash = Math.max(0, this.shipHitFlash - dt);
    }
    if (this.shipMuzzleFlash > 0) {
      this.shipMuzzleFlash = Math.max(0, this.shipMuzzleFlash - dt);
    }

    // Slow scroll of the space background
    this.bgOffset = (this.bgOffset + dt * 15) % this.canvas.height;
  }

  /* ------------------------------------------------------------
     GENERAL DRAW (called every frame)
     ------------------------------------------------------------ */
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Space background (smooth, seamless vertical scroll)
    if (this.backgroundImg && this.backgroundImg.complete) {
      const offset = this.bgOffset;
      ctx.drawImage(this.backgroundImg, 0, offset - h, w, h);
      ctx.drawImage(this.backgroundImg, 0, offset, w, h);
    } else {
      ctx.fillStyle = "#05060f";
      ctx.fillRect(0, 0, w, h);
    }

    // Asteroids
    for (const asteroid of this.asteroids) {
      asteroid.draw(ctx, this.asteroidImg);
    }

    // Player ship (fixed, at the bottom)
    this.drawShip(ctx);

    // Bullets (travel from the ship toward the asteroids)
    for (const bullet of this.bullets) {
      bullet.draw(ctx);
    }

    // Explosions (drawn last so they appear on top of everything else)
    for (const exp of this.explosions) {
      exp.draw(ctx, this.explosionImg);
    }
  }

  /* --- Draws the ship, its shield glow and the hit flash --- */
  drawShip(ctx) {
    if (!this.shipImg || this.state === "menu") return;

    ctx.save();

    // Pulsing halo/shield behind the ship
    const pulse = 0.5 + Math.sin(performance.now() / 250) * 0.15;
    ctx.beginPath();
    ctx.arc(this.shipX, this.shipY + 6, this.shipCollisionRadius + 14, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(90, 200, 255, ${0.25 * pulse + 0.1})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Red flash right after taking a hit
    if (this.shipHitFlash > 0) {
      const alpha = this.shipHitFlash / 0.35;
      ctx.beginPath();
      ctx.arc(this.shipX, this.shipY, this.shipCollisionRadius + 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 60, ${alpha * 0.35})`;
      ctx.fill();
    }

    // Ship sprite, centered on (shipX, shipY)
    ctx.drawImage(
      this.shipImg,
      this.shipX - this.shipWidth / 2,
      this.shipY - this.shipHeight / 2,
      this.shipWidth,
      this.shipHeight
    );

    // Muzzle flash when firing
    if (this.shipMuzzleFlash > 0) {
      const alpha = this.shipMuzzleFlash / 0.08;
      ctx.beginPath();
      ctx.arc(this.shipX, this.shipY - this.shipHeight / 2 + 6, 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 245, 255, ${alpha})`;
      ctx.shadowColor = "#9fe8ff";
      ctx.shadowBlur = 14;
      ctx.fill();
    }

    ctx.restore();
  }

  /* ------------------------------------------------------------
     MAIN LOOP using requestAnimationFrame
     ------------------------------------------------------------ */
  loop(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05); // seconds, capped
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

/* ----------------------------------------------------------
   6. INITIALIZATION
   ---------------------------------------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
