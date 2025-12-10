// --- CONFIGURACIÓN ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const hpBarFill = document.getElementById('hp-bar-fill');

// --- CARGA DE GRÁFICOS DESDE LA CARPETA 'assets' ---
// Este código ahora carga tus imágenes personalizadas.

const playerImg = new Image();
const homunculusImg = new Image();
const enemyImg = new Image();
const backgroundImg = new Image();

playerImg.src = 'assets/player.png';
homunculusImg.src = 'assets/homunculus.png';
enemyImg.src = 'assets/enemy.png';
backgroundImg.src = 'assets/background.png';

let assetsLoaded = 0;
const totalAssets = 4; // Ahora son 4 assets

function assetLoaded() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        init(); // Inicia el juego solo cuando todas las imágenes estén cargadas
    }
}

playerImg.onload = assetLoaded;
homunculusImg.onload = assetLoaded;
enemyImg.onload = assetLoaded;
backgroundImg.onload = assetLoaded;

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
        this.size = 64; // Ajusta al tamaño de tu sprite
    }

    update(keys) {
        if (keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if (keys['ArrowDown'] && this.y < canvas.height - this.size) this.y += this.speed;
        if (keys['ArrowLeft'] && this.x > 0) this.x -= this.speed;
        if (keys['ArrowRight'] && this.x < canvas.width - this.size) this.x += this.speed;
    }

    draw() {
        ctx.drawImage(playerImg, this.x, this.y, this.size, this.size);
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
        this.size = 32; // Ajusta al tamaño de tu sprite
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
        ctx.drawImage(homunculusImg, this.x, this.y, this.size, this.size);
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 1.5;
        this.size = 48; // Ajusta al tamaño de tu sprite
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
        ctx.drawImage(enemyImg, this.x, this.y, this.size, this.size);
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
    // 1. Dibuja el fondo de baldosas
    const tileSize = 64; // Asegúrate de que coincida con el tamaño de tu imagen de fondo
    for (let y = 0; y < canvas.height; y += tileSize) {
        for (let x = 0; x < canvas.width; x += tileSize) {
            ctx.drawImage(backgroundImg, x, y, tileSize, tileSize);
        }
    }

    // 2. Dibuja los personajes y proyectiles
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
        if (distY > (obj2.size / 2 + obj1.radius)) return false;
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