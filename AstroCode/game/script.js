/* ==========================================================
   ASTROCODE
   Juego estilo ZType: destruye asteroides escribiendo palabras.
   Tecnologías: HTML5 Canvas + JavaScript puro (sin librerías).
   ========================================================== */

/* ----------------------------------------------------------
   1. LISTA DE PALABRAS OBLIGATORIAS (30 palabras)
   ---------------------------------------------------------- */
const WORD_LIST = [
  "Code", "Bug", "Loop", "Java", "Python", "Bottleneck", "Object",
  "Python", "HTML", "CSS", "PHP", "Algorithm", "Frontend", "Backend",
  "Paradigm", "Class", "Object", "DDoS Attack", "Software", "Deployment",
  "Feature", "Scrum", "Scalability", "Kanban", "Framework", "Middleware",
  "Agile", "String", "Programming", "Refactoring"
];

/* ----------------------------------------------------------
   2. CLASE Asteroid
   Representa un asteroide individual con su palabra asociada.
   ---------------------------------------------------------- */
class Asteroid {
  constructor(word, x, y, speed, radius, targetX, targetY) {
    this.word = word;          // Palabra completa (con mayúsculas originales)
    this.typedIndex = 0;       // Cuántos caracteres ya se escribieron correctamente
    this.x = x;
    this.y = y;
    this.speed = speed;        // Píxeles por segundo (velocidad vertical)
    this.radius = radius;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.6; // radianes/seg
    this.isSelected = false;
    this.markedForRemoval = false;

    // --- Movimiento diagonal hacia la nave ---
    // Se calcula una velocidad horizontal (vx) para que el asteroide
    // llegue exactamente a la posición de la nave (targetX, targetY)
    // en el mismo momento en que su "y" alcance la altura de la nave.
    const timeToReach = Math.max((targetY - y) / speed, 0.001);
    this.vx = (targetX - x) / timeToReach;
  }

  // Actualiza posición y rotación según el tiempo transcurrido (dt en segundos)
  update(dt) {
    this.y += this.speed * dt;
    this.x += this.vx * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  // ¿La palabra ya fue completada?
  isComplete() {
    return this.typedIndex >= this.word.length;
  }

  // Dibuja el asteroide y su palabra sobre el canvas
  draw(ctx, asteroidImg) {
    // --- Dibujar el asteroide (imagen rotando) ---
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    const size = this.radius * 2;
    ctx.drawImage(asteroidImg, -this.radius, -this.radius, size, size);
    ctx.restore();

    // Resplandor si está seleccionado
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

    // --- Dibujar la palabra (parte escrita en verde, resto en blanco) ---
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.textBaseline = "middle";

    const typedPart = this.word.slice(0, this.typedIndex);
    const restPart = this.word.slice(this.typedIndex);

    const typedWidth = ctx.measureText(typedPart).width;
    const restWidth = ctx.measureText(restPart).width;
    const totalWidth = typedWidth + restWidth;

    const textY = this.y - this.radius - 14;
    let startX = this.x - totalWidth / 2;

    // Fondo semitransparente para legibilidad
    ctx.fillStyle = "rgba(3, 4, 12, 0.55)";
    ctx.fillRect(startX - 6, textY - 12, totalWidth + 12, 24);

    ctx.textAlign = "left";
    ctx.fillStyle = "#4ee44e"; // verde - letras correctas
    ctx.shadowColor = "#4ee44e";
    ctx.shadowBlur = 6;
    ctx.fillText(typedPart, startX, textY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff"; // blanco - letras pendientes
    ctx.fillText(restPart, startX + typedWidth, textY);
  }
}

/* ----------------------------------------------------------
   3. CLASE Bullet
   Disparo láser que sale de la nave cada vez que se teclea
   correctamente una letra, viajando hacia el asteroide objetivo.
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
    const speed = 1100; // píxeles por segundo
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

    // Estela del disparo (degradado)
    const grad = ctx.createLinearGradient(-16, 0, 4, 0);
    grad.addColorStop(0, "rgba(120, 220, 255, 0)");
    grad.addColorStop(1, "rgba(190, 245, 255, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(-16, -1.5, 20, 3);

    // Punta brillante del proyectil
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
   4. CLASE ExplosionEffect
   Animación simple que se reproduce cuando un asteroide es destruido.
   ---------------------------------------------------------- */
class ExplosionEffect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.duration = 0.35; // segundos que dura la animación
  }

  update(dt) {
    this.age += dt;
  }

  isFinished() {
    return this.age >= this.duration;
  }

  draw(ctx, explosionImg) {
    const progress = this.age / this.duration; // 0 -> 1
    const scale = 0.6 + progress * 1.2;         // crece
    const alpha = 1 - progress;                 // se desvanece
    const size = 90 * scale;

    ctx.save();
    ctx.globalAlpha = Math.max(alpha, 0);
    ctx.drawImage(explosionImg, this.x - size / 2, this.y - size / 2, size, size);
    ctx.restore();
  }
}

/* ----------------------------------------------------------
   5. CLASE Game
   Controla el estado, el bucle principal, la dificultad y el input.
   ---------------------------------------------------------- */
class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Referencias a elementos del DOM (HUD y pantallas)
    this.scoreEl = document.getElementById("score");
    this.levelEl = document.getElementById("level");
    this.livesEl = document.getElementById("lives");
    this.startScreen = document.getElementById("start-screen");
    this.gameOverScreen = document.getElementById("gameover-screen");
    this.finalScoreEl = document.getElementById("finalScore");

    // Estado del juego
    this.state = "menu"; // 'menu' | 'playing' | 'gameover'
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.destroyedCount = 0;

    // Entidades activas
    this.asteroids = [];
    this.explosions = [];
    this.bullets = [];
    this.selectedAsteroid = null;

    // Parámetros de dificultad (se ajustan con el nivel)
    this.baseSpeed = 60;        // px/seg inicial
    this.spawnInterval = 2200;  // ms entre apariciones
    this.minSpawnInterval = 650;
    this.spawnTimer = 0;

    // Cola de palabras: ordenadas de mayor a menor longitud,
    // así las palabras más largas (difíciles) aparecen primero.
    this.wordQueue = this.buildWordQueue();
    this.wordQueueIndex = 0;

    this.lastTimestamp = 0;

    this.loadAssets().then(() => this.bindEvents());
  }

  /* --- Ajusta el tamaño del canvas al tamaño de la ventana --- */
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.shipImg) this.updateShipPosition();
  }

  /* --- Carga las imágenes usadas por el juego --- */
  loadAssets() {
    const loadImage = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img); // Continúa aunque falle, para no bloquear el juego
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
      this.bgOffset = 0; // para el scroll lento del fondo
      this.shipHitFlash = 0; // tiempo restante del destello al recibir impacto
      this.shipMuzzleFlash = 0; // tiempo restante del destello al disparar
      this.updateShipPosition();
    });
  }

  /* --- Calcula dónde está la nave (fija, centrada, cerca del fondo) --- */
  updateShipPosition() {
    this.shipWidth = 70;
    this.shipHeight = 80;
    this.shipX = this.canvas.width / 2;
    this.shipY = this.canvas.height - this.shipHeight / 2 - 24;
    this.shipCollisionRadius = 30; // radio aproximado del casco para colisiones
  }

  /* --- Crea la cola de palabras ordenada de más larga a más corta --- */
  buildWordQueue() {
    return [...WORD_LIST].sort((a, b) => b.length - a.length);
  }

  /* --- Conecta los botones y el teclado --- */
  bindEvents() {
    document.getElementById("startBtn").addEventListener("click", () => this.startGame());
    document.getElementById("restartBtn").addEventListener("click", () => this.startGame());
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));

    requestAnimationFrame((t) => this.loop(t));
  }

  /* --- Reinicia todas las variables y comienza una nueva partida --- */
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
    this.gameOverScreen.classList.add("hidden");
    this.state = "playing";
  }

  /* --- Finaliza la partida --- */
  endGame() {
    this.state = "gameover";
    this.finalScoreEl.textContent = `Puntaje final: ${this.score}`;
    this.gameOverScreen.classList.remove("hidden");
  }

  /* --- Obtiene la siguiente palabra de la cola (cíclica) --- */
  nextWord() {
    const word = this.wordQueue[this.wordQueueIndex % this.wordQueue.length];
    this.wordQueueIndex++;
    return word;
  }

  /* --- Genera un nuevo asteroide en una posición X aleatoria --- */
  spawnAsteroid() {
    const word = this.nextWord();
    const margin = 60;
    const x = margin + Math.random() * (this.canvas.width - margin * 2);
    const y = -40;
    const speedVariance = 0.85 + Math.random() * 0.3;
    const speed = this.baseSpeed * speedVariance;
    const radius = 28 + Math.random() * 10;

    // El objetivo es la nave: se agrega una pequeña dispersión horizontal
    // para que los asteroides no lleguen todos exactamente al mismo punto.
    const targetX = this.shipX + (Math.random() * 90 - 45);
    const targetY = this.shipY;

    this.asteroids.push(new Asteroid(word, x, y, speed, radius, targetX, targetY));
  }

  /* --- Sube de nivel: aumenta velocidad y frecuencia de aparición --- */
  levelUp() {
    this.level++;
    this.baseSpeed += 9;
    this.spawnInterval = Math.max(this.minSpawnInterval, this.spawnInterval - 150);
    this.updateHUD();
  }

  /* --- Actualiza los textos del HUD --- */
  updateHUD() {
    this.scoreEl.textContent = this.score;
    this.levelEl.textContent = this.level;
    this.livesEl.textContent = "❤".repeat(Math.max(this.lives, 0)) || "—";
  }

  /* ------------------------------------------------------------
     MANEJO DE TECLADO
     - Si no hay asteroide seleccionado, busca uno cuya palabra
       empiece con la letra presionada (el más cercano al fondo).
     - Si ya hay uno seleccionado, valida el siguiente carácter.
     ------------------------------------------------------------ */
  handleKeyDown(e) {
    if (this.state !== "playing") return;

    // Solo nos interesan teclas de un solo carácter (letras, espacio, etc.)
    if (e.key.length !== 1) return;
    e.preventDefault();

    const typedChar = e.key.toLowerCase();

    if (!this.selectedAsteroid) {
      // Buscar candidatos cuyo primer carácter coincida
      const candidates = this.asteroids.filter(
        (a) => a.typedIndex === 0 && a.word[0].toLowerCase() === typedChar
      );
      if (candidates.length === 0) return;

      // Elegimos el más urgente: el que está más abajo (más cerca de la Tierra)
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

    // Ya hay un asteroide seleccionado: validar siguiente letra
    const asteroid = this.selectedAsteroid;
    const expectedChar = asteroid.word[asteroid.typedIndex]?.toLowerCase();

    if (expectedChar === typedChar) {
      asteroid.typedIndex++;
      this.fireBullet(asteroid);
      if (asteroid.isComplete()) {
        this.destroyAsteroid(asteroid);
      }
    }
    // Si la letra no coincide, simplemente se ignora (no penaliza, no dispara).
  }

  /* --- Dispara un proyectil desde la nave hacia un asteroide --- */
  fireBullet(asteroid) {
    const originX = this.shipX;
    const originY = this.shipY - this.shipHeight / 2 + 6; // sale desde la "nariz"
    this.bullets.push(new Bullet(originX, originY, asteroid.x, asteroid.y));
    this.shipMuzzleFlash = 0.08; // breve destello en el cañón
  }

  /* --- Elimina un asteroide, suma puntos y crea la animación de explosión --- */
  destroyAsteroid(asteroid) {
    asteroid.markedForRemoval = true;
    this.explosions.push(new ExplosionEffect(asteroid.x, asteroid.y));

    this.score += asteroid.word.replace(/\s/g, "").length * 10;
    this.destroyedCount++;
    this.selectedAsteroid = null;

    // Cada 5 asteroides destruidos, sube el nivel de dificultad
    if (this.destroyedCount % 5 === 0) {
      this.levelUp();
    }

    this.updateHUD();
  }

  /* --- Un asteroide impactó la nave: se pierde una vida --- */
  loseLife(asteroid) {
    asteroid.markedForRemoval = true;
    if (this.selectedAsteroid === asteroid) {
      this.selectedAsteroid = null;
    }
    this.lives--;
    this.shipHitFlash = 0.35; // destello rojo breve sobre la nave
    this.explosions.push(new ExplosionEffect(asteroid.x, this.shipY));
    this.updateHUD();

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  /* ------------------------------------------------------------
     ACTUALIZACIÓN GENERAL (llamada en cada frame)
     ------------------------------------------------------------ */
  update(dt) {
    if (this.state !== "playing") return;

    // Control de aparición de nuevos asteroides
    this.spawnTimer -= dt * 1000;
    if (this.spawnTimer <= 0) {
      this.spawnAsteroid();
      this.spawnTimer = this.spawnInterval;
    }

    // Actualizar asteroides y detectar colisión con la nave
    for (const asteroid of this.asteroids) {
      asteroid.update(dt);
      const dx = asteroid.x - this.shipX;
      const dy = asteroid.y - this.shipY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitDistance = asteroid.radius + this.shipCollisionRadius;

      if (!asteroid.markedForRemoval && dist <= hitDistance) {
        this.loseLife(asteroid);
      } else if (!asteroid.markedForRemoval && asteroid.y - asteroid.radius > this.canvas.height) {
        // Salvaguarda: si por alguna razón pasa de largo, igual se descarta
        this.loseLife(asteroid);
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.markedForRemoval);

    // Actualizar explosiones
    for (const exp of this.explosions) exp.update(dt);
    this.explosions = this.explosions.filter((e) => !e.isFinished());

    // Actualizar disparos
    for (const bullet of this.bullets) bullet.update(dt);
    this.bullets = this.bullets.filter((b) => !b.markedForRemoval);

    // Reducir el temporizador del destello de impacto en la nave
    if (this.shipHitFlash > 0) {
      this.shipHitFlash = Math.max(0, this.shipHitFlash - dt);
    }
    if (this.shipMuzzleFlash > 0) {
      this.shipMuzzleFlash = Math.max(0, this.shipMuzzleFlash - dt);
    }

    // Scroll lento del fondo espacial
    this.bgOffset = (this.bgOffset + dt * 15) % this.canvas.height;
  }

  /* ------------------------------------------------------------
     DIBUJADO GENERAL (llamado en cada frame)
     ------------------------------------------------------------ */
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fondo espacial (con scroll vertical suave y sin costuras)
    if (this.backgroundImg && this.backgroundImg.complete) {
      const offset = this.bgOffset;
      ctx.drawImage(this.backgroundImg, 0, offset - h, w, h);
      ctx.drawImage(this.backgroundImg, 0, offset, w, h);
    } else {
      ctx.fillStyle = "#05060f";
      ctx.fillRect(0, 0, w, h);
    }

    // Asteroides
    for (const asteroid of this.asteroids) {
      asteroid.draw(ctx, this.asteroidImg);
    }

    // Nave del jugador (fija, en la parte inferior)
    this.drawShip(ctx);

    // Disparos (viajan desde la nave hacia los asteroides)
    for (const bullet of this.bullets) {
      bullet.draw(ctx);
    }

    // Explosiones (se dibujan al final para que se vean sobre todo lo demás)
    for (const exp of this.explosions) {
      exp.draw(ctx, this.explosionImg);
    }
  }

  /* --- Dibuja la nave, su estela y el destello al recibir un impacto --- */
  drawShip(ctx) {
    if (!this.shipImg || this.state === "menu") return;

    ctx.save();

    // Halo/escudo pulsante detrás de la nave
    const pulse = 0.5 + Math.sin(performance.now() / 250) * 0.15;
    ctx.beginPath();
    ctx.arc(this.shipX, this.shipY + 6, this.shipCollisionRadius + 14, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(90, 200, 255, ${0.25 * pulse + 0.1})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Destello rojo si acaba de recibir un impacto
    if (this.shipHitFlash > 0) {
      const alpha = this.shipHitFlash / 0.35;
      ctx.beginPath();
      ctx.arc(this.shipX, this.shipY, this.shipCollisionRadius + 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 60, ${alpha * 0.35})`;
      ctx.fill();
    }

    // Sprite de la nave, centrado en (shipX, shipY)
    ctx.drawImage(
      this.shipImg,
      this.shipX - this.shipWidth / 2,
      this.shipY - this.shipHeight / 2,
      this.shipWidth,
      this.shipHeight
    );

    // Destello del cañón al disparar
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
     BUCLE PRINCIPAL con requestAnimationFrame
     ------------------------------------------------------------ */
  loop(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05); // segundos, con tope
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

/* ----------------------------------------------------------
   6. INICIALIZACIÓN
   ---------------------------------------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
