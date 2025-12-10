// --- CONFIGURACIÓN ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// --- ELEMENTOS DE UI ---
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const levelUpModal = document.getElementById('level-up-modal');
const hpBarFill = document.getElementById('hp-bar-fill');
const xpBarFill = document.getElementById('xp-bar-fill');
const hpText = document.getElementById('hp-text');
const xpText = document.getElementById('xp-text');
const levelText = document.getElementById('level-text');

// --- CARGA DE GRÁFICOS ---
const playerImg = new Image();
const homunculusImg = new Image();
const enemyImg = new Image();
const backgroundImg = new Image();

playerImg.src = 'assets/player.png';
homunculusImg.src = 'assets/homunculus.png';
enemyImg.src = 'assets/enemy.png';
backgroundImg.src = 'assets/background.png';

let assetsLoaded = 0;
const totalAssets = 4;

function assetLoaded() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        loadGameData();
    }
}
playerImg.onload = assetLoaded;
homunculusImg.onload = assetLoaded;
enemyImg.onload = assetLoaded;
backgroundImg.onload = assetLoaded;

// --- VARIABLES GLOBALES ---
let player;
let homunculus;
let enemies = [];
let projectiles = [];
let score = 0;
let gameOver = false;
let isPaused = false;
let lastTime = 0;
let enemySpawnTimer = 0;
let enemySpawnInterval = 2000;

// --- CLASES ---
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseSpeed = 5;
        this.speed = 5;
        this.hp = 100;
        this.maxHp = 100;
        this.size = 64;
        
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 10;
        this.unspentPoints = 0;
        this.attack = 10;
        this.magic = 500;
    }

    update(keys) {
        if (keys['w'] && this.y > 0) this.y -= this.speed;
        if (keys['s'] && this.y < canvas.height - this.size) this.y += this.speed;
        if (keys['a'] && this.x > 0) this.x -= this.speed;
        if (keys['d'] && this.x < canvas.width - this.size) this.x += this.speed;
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
        updateUI();
    }

    gainXp(amount) {
        this.xp += amount;
        while (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
        updateUI();
    }

    levelUp() {
        this.level++;
        this.unspentPoints += 5;
        this.xp = this.xp - this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        this.hp = this.maxHp;
        isPaused = true;
        showLevelUpModal();
        saveGameData();
    }

    addAttribute(attribute) {
        if (this.unspentPoints <= 0) return;

        switch (attribute) {
            case 'attack':
                this.attack += 2;
                document.getElementById('attack-value').innerText = this.attack;
                break;
            case 'health':
                this.maxHp += 20;
                this.hp += 20;
                document.getElementById('health-value').innerText = this.maxHp;
                break;
            case 'speed':
                this.baseSpeed += 0.5;
                this.speed = this.baseSpeed;
                document.getElementById('speed-value').innerText = this.baseSpeed.toFixed(1);
                break;
            case 'magic':
                this.magic -= 50;
                document.getElementById('magic-value').innerText = this.magic;
                break;
        }
        this.unspentPoints--;
        document.getElementById('points-to-spend').innerText = this.unspentPoints;
        updateUI();
        saveGameData();
    }
}

class Homunculus {
    constructor(player) {
        this.player = player;
        this.x = player.x;
        this.y = player.y;
        this.speed = 6;
        this.size = 32;
    }

    update() {
        const dx = this.player.x + this.player.size/2 - this.x - this.size/2;
        const dy = this.player.y + this.player.size/2 - this.y - this.size/2;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
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
        this.size = 48;
        this.hp = 3;
        this.xpValue = 2;
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

    takeDamage(damageAmount) {
        this.hp -= damageAmount;
        if (this.hp <= 0) {
            score += 10;
            player.gainXp(this.xpValue);
            scoreElement.textContent = score;
            return true;
        }
        return false;
    }
}

class Projectile {
    constructor(startX, startY, targetX, targetY, damage) {
        this.x = startX;
        this.y = startY;
        this.speed = 12;
        const angle = Math.atan2(targetY - startY, targetX - startX);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.radius = 5;
        this.damage = damage;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.fillStyle = '#ADFF2F';
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
    gameOver = false;
    isPaused = false;
    scoreElement.textContent = score;
    gameOverScreen.classList.add('hidden');
    levelUpModal.classList.add('hidden');
    updateUI();
    
    setupEventListeners();
    setupLevelUpModalListeners(); // <-- NUEVO: Configurar los botones del modal
    
    gameLoop();
}

function gameLoop(currentTime = 0) {
    if (gameOver) return;
    requestAnimationFrame(gameLoop);

    if (isPaused) return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    update(deltaTime);
    draw();
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

    player.update(keys);
    homunculus.update();

    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update(player);
        if (checkCollision(player, enemies[i])) {
            player.takeDamage(10);
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
                if (enemies[j].takeDamage(projectiles[i].damage)) {
                    enemies.splice(j, 1);
                }
                projectiles.splice(i, 1);
                break;
            }
        }
    }
}

function draw() {
    const tileSize = 64;
    for (let y = 0; y < canvas.height; y += tileSize) {
        for (let x = 0; x < canvas.width; x += tileSize) {
            ctx.drawImage(backgroundImg, x, y, tileSize, tileSize);
        }
    }

    player.draw();
    homunculus.draw();
    enemies.forEach(enemy => enemy.draw());
    projectiles.forEach(projectile => projectile.draw());
}

// --- FUNCIONES DE CONTROL Y UI ---
const keys = {};
let mouseX = 0, mouseY = 0;
let canShoot = true;

function setupEventListeners() {
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 && !gameOver && !isPaused && canShoot) {
            const projectileX = homunculus.x + homunculus.size / 2;
            const projectileY = homunculus.y + homunculus.size / 2;
            projectiles.push(new Projectile(projectileX, projectileY, mouseX, mouseY, player.attack));
            
            canShoot = false;
            setTimeout(() => { canShoot = true; }, player.magic);
        }
    });
}

// CAMBIO CLAVE: Nueva función para asignar eventos a los botones del modal
function setupLevelUpModalListeners() {
    document.getElementById('btn-attack').addEventListener('click', () => player.addAttribute('attack'));
    document.getElementById('btn-health').addEventListener('click', () => player.addAttribute('health'));
    document.getElementById('btn-speed').addEventListener('click', () => player.addAttribute('speed'));
    document.getElementById('btn-magic').addEventListener('click', () => player.addAttribute('magic'));
    document.getElementById('btn-confirm-level-up').addEventListener('click', confirmLevelUp);
}

function updateUI() {
    hpText.textContent = `${player.hp}/${player.maxHp}`;
    const hpPercent = (player.hp / player.maxHp) * 100;
    hpBarFill.style.width = hpPercent + '%';
    if (hpPercent < 30) {
        hpBarFill.classList.add('low-hp');
    } else {
        hpBarFill.classList.remove('low-hp');
    }

    levelText.textContent = player.level;
    xpText.textContent = `${player.xp}/${player.xpToNextLevel}`;
    const xpPercent = (player.xp / player.xpToNextLevel) * 100;
    xpBarFill.style.width = xpPercent + '%';
}

function showLevelUpModal() {
    document.getElementById('points-to-spend').innerText = player.unspentPoints;
    document.getElementById('attack-value').innerText = player.attack;
    document.getElementById('health-value').innerText = player.maxHp;
    document.getElementById('speed-value').innerText = player.baseSpeed.toFixed(1);
    document.getElementById('magic-value').innerText = player.magic;
    levelUpModal.classList.remove('hidden');
}

function confirmLevelUp() {
    levelUpModal.classList.add('hidden');
    isPaused = false;
}

function handleGameOver() {
    gameOver = true;
    gameOverScreen.classList.remove('hidden');
}

// --- SISTEMA DE GUARDADO ---
function saveGameData() {
    const gameData = {
        level: player.level,
        xp: player.xp,
        xpToNextLevel: player.xpToNextLevel,
        unspentPoints: player.unspentPoints,
        attack: player.attack,
        maxHp: player.maxHp,
        baseSpeed: player.baseSpeed,
        magic: player.magic
    };
    localStorage.setItem('rpgCreatorGameSave', JSON.stringify(gameData));
}

function loadGameData() {
    const savedData = localStorage.getItem('rpgCreatorGameSave');
    if (savedData) {
        const gameData = JSON.parse(savedData);
        player = new Player(canvas.width / 2 - 32, canvas.height / 2 - 32);
        player.level = gameData.level || 1;
        player.xp = gameData.xp || 0;
        player.xpToNextLevel = gameData.xpToNextLevel || 10;
        player.unspentPoints = gameData.unspentPoints || 0;
        player.attack = gameData.attack || 10;
        player.maxHp = gameData.maxHp || 100;
        player.hp = player.maxHp;
        player.baseSpeed = gameData.baseSpeed || 5;
        player.speed = player.baseSpeed;
        player.magic = gameData.magic || 500;
    } else {
        player = new Player(canvas.width / 2 - 32, canvas.height / 2 - 32);
    }
    
    homunculus = new Homunculus(player);
    enemies = [];
    projectiles = [];
    score = 0;
    gameOver = false;
    isPaused = false;
    scoreElement.textContent = score;
    gameOverScreen.classList.add('hidden');
    levelUpModal.classList.add('hidden');
    updateUI();
    setupEventListeners();
    setupLevelUpModalListeners(); // <-- NUEVO: Asegurarse de configurar los listeners aquí también
    gameLoop();
}

// --- FUNCIONES AUXILIARES ---
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