// --- CONFIGURACIÓN ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const hpBarFill = document.getElementById('hp-bar-fill');

// --- VARIABLES DEL JUEGO ---
let player;
let homunculus;
let enemies = [];
let projectiles = [];
let score = 0;
let gameOver = false;
let lastTime = 0;
let enemySpawnTimer = 0;
let enemySpawnInterval = 2000; // 2 segundos

// --- CLASES ---
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 5;
        this.hp = 100;
        this.maxHp = 100;
        this.size = 64; // Tamaño del "sprite"
    }

    update(keys) {
        if (keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if (keys['ArrowDown'] && this.y < canvas.height - this.size) this.y += this.speed;
        if (keys['ArrowLeft'] && this.x > 0) this.x -= this.speed;
        if (keys['ArrowRight'] && this.x < canvas.width - this.size) this.x += this.speed;
    }

    draw() {
        const px = this.x;
        const py = this.y;
        // Dibuja un Creator estilo pixel art
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px + 8, py + 48, 48, 8);
        // Piernas (marrón oscuro)
        ctx.fillStyle = '#654321';
        ctx.fillRect(px + 12, py + 36, 12, 16);
        ctx.fillRect(px + 28, py + 36, 12, 16);
        // Bata blanca
        ctx.fillStyle = '#F0F0F0';
        ctx.fillRect(px + 8, py + 20, 36, 20);
        // Brazos
        ctx.fillRect(px, py + 24, 8, 12);
        ctx.fillRect(px + 44, py + 24, 8, 12);
        // Cabeza
        ctx.fillStyle = '#FDBCB4'; // Color piel
        ctx.fillRect(px + 16, py + 8, 20, 16);
        // Sombrero de Creator (púrpura con una gema)
        ctx.fillStyle = '#4B0082'; // Índigo
        ctx.fillRect(px + 12, py + 4, 28, 8);
        ctx.fillRect(px + 20, py, 12, 4);
        ctx.fillStyle = '#FFD700'; // Gema dorada
        ctx.fillRect(px + 26, py + 6, 4, 4);
        // Ojos
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 20, py + 12, 3, 3);
        ctx.fillRect(px + 29, py + 12, 3, 3);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            handleGameOver();
        }
        updateHpBar();
    }
}

class Homunculus {
    constructor(player) {
        this.player = player;
        this.x = player.x;
        this.y = player.y;
        this.speed = 6;
        this.size = 32;
        this.shootCooldown = 0;
        this.shootInterval = 500;
    }

    update(deltaTime, enemies) {
        const dx = this.player.x + this.player.size/2 - this.x - this.size/2;
        const dy = this.player.y + this.player.size/2 - this.y - this.size/2;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 60) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        this.shootCooldown -= deltaTime;
        if (this.shootCooldown <= 0) {
            const target = this.findClosestEnemy(enemies);
            if (target) {
                this.shoot(target);
                this.shootCooldown = this.shootInterval;
            }
        }
    }

    findClosestEnemy(enemies) {
        let closest = null;
        let minDistance = Infinity;
        enemies.forEach(enemy => {
            const dx = enemy.x + enemy.size/2 - this.x - this.size/2;
            const dy = enemy.y + enemy.size/2 - this.y - this.size/2;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                minDistance = distance;
                closest = enemy;
            }
        });
        return closest;
    }

    shoot(target) {
        const angle = Math.atan2(target.y + target.size/2 - this.y - this.size/2, target.x + target.size/2 - this.x - this.size/2);
        projectiles.push(new Projectile(this.x + this.size/2, this.y + this.size/2, angle));
    }

    draw() {
        const hx = this.x;
        const hy = this.y;
        // Dibuja un Homunculus tipo pájaro (Filir)
        // Cuerpo (dorado)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(hx + 4, hy + 8, 24, 16);
        // Alas (naranja)
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(hx, hy + 10, 6, 10);
        ctx.fillRect(hx + 26, hy + 10, 6, 10);
        // Cabeza
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(hx + 8, hy + 2, 16, 8);
        // Pico
        ctx.fillStyle = '#FF6347';
        ctx.fillRect(hx + 12, hy, 8, 4);
        // Ojo
        ctx.fillStyle = '#000';
        ctx.fillRect(hx + 18, hy + 4, 3, 3);
        // Cola
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(hx + 2, hy + 20, 4, 8);
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 1.5;
        this.size = 48;
        this.hp = 3;
    }

    update(player) {
        const dx = player.x + player.size/2 - this.x - this.size/2;
        const dy = player.y + player.size/2 - this.y - this.size/2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
    }

    draw() {
        const ex = this.x;
        const ey = this.y;
        // Dibuja un Poring estilo pixel art
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(ex + this.size/2, ey + this.size - 4, this.size/2 - 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cuerpo principal (bola gelatinosa rosa)
        ctx.fillStyle = '#FFC0CB';
        ctx.beginPath();
        ctx.ellipse(ex + this.size/2, ey + this.size/2, this.size/2, this.size/2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ojos
        ctx.fillStyle = '#000';
        ctx.fillRect(ex + 12, ey + 16, 6, 6);
        ctx.fillRect(ex + 30, ey + 16, 6, 6);
        // Brillo en los ojos
        ctx.fillStyle = '#FFF';
        ctx.fillRect(ex + 14, ey + 18, 2, 2);
        ctx.fillRect(ex + 32, ey + 18, 2, 2);
        // Boca
        ctx.fillRect(ex + 18, ey + 28, 12, 3);
    }

    takeDamage() {
        this.hp--;
        if (this.hp <= 0) {
            score += 10;
            scoreElement.textContent = score;
            return true;
        }
        return false;
    }
}

class Projectile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.angle = angle;
        this.radius = 5;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        ctx.fillStyle = '#ADFF2F'; // Verde amarillento (Ácido)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    isOffScreen() {
        return this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height;
    }
}

// --- FUNCIONES PRINCIPALES ---
function init() {
    player = new Player(canvas.width / 2 - 32, canvas.height / 2 - 32);
    homunculus = new Homunculus(player);
    enemies = [];
    projectiles = [];
    score = 0;
    scoreElement.textContent = score;
    gameOver = false;
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

function gameLoop(currentTime = 0) {
    if (gameOver) return;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    update(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    enemySpawnTimer += deltaTime;
    if (enemySpawnTimer > enemySpawnInterval) {
        spawnEnemy();
        enemySpawnTimer = 0;
        if (enemySpawnInterval > 500) {
            enemySpawnInterval -= 10;
        }
    }

    const keys = {};
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    player.update(keys);
    homunculus.update(deltaTime, enemies);

    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update(player);
        if (checkCollision(player, enemies[i])) {
            player.takeDamage(1);
            enemies.splice(i, 1);
        }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        if (projectiles[i].isOffScreen()) {
            projectiles.splice(i, 1);
            continue;
        }
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(projectiles[i], enemies[j])) {
                if (enemies[j].takeDamage()) {
                    enemies.splice(j, 1);
                }
                projectiles.splice(i, 1);
                break;
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.draw();
    homunculus.draw();
    enemies.forEach(enemy => enemy.draw());
    projectiles.forEach(projectile => projectile.draw());
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const size = 48;
    switch (side) {
        case 0: x = Math.random() * canvas.width; y = -size; break;
        case 1: x = canvas.width; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height; break;
        case 3: x = -size; y = Math.random() * canvas.height; break;
    }
    enemies.push(new Enemy(x, y));
}

function checkCollision(obj1, obj2) {
    if (obj1.radius) {
        const enemyCenterX = obj2.x + obj2.size / 2;
        const enemyCenterY = obj2.y + obj2.size / 2;
        const distX = Math.abs(obj1.x - enemyCenterX);
        const distY = Math.abs(obj1.y - enemyCenterY);
        if (distX > (obj2.size / 2 + obj1.radius)) return false;
        if (distY > (obj2.size / 2.5 + obj1.radius)) return false;
        return true;
    } else {
        return obj1.x < obj2.x + obj2.size &&
               obj1.x + obj1.size > obj2.x &&
               obj1.y < obj2.y + obj2.size &&
               obj1.y + obj1.size > obj2.y;
    }
}

function updateHpBar() {
    const hpPercent = (player.hp / player.maxHp) * 100;
    hpBarFill.style.width = hpPercent + '%';
    if (hpPercent < 30) {
        hpBarFill.classList.add('low-hp');
    }
}

function handleGameOver() {
    gameOver = true;
    gameOverScreen.classList.remove('hidden');
}

// --- INICIAR EL JUEGO ---
init();