// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('statusText');

// Game State
const game = {
    width: 800,
    height: 600,
    running: true,
    keys: {},
    mouse: { x: 0, y: 0 }
};

// Felt Dog Character
class FeltDog {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 60;
        this.speed = 3;
        this.velocityY = 0;
        this.gravity = 0.6;
        this.jumpPower = -12;
        this.isJumping = false;
        this.groundY = game.height - 100;

        // Animation
        this.state = 'idle'; // idle, walking, jumping, happy
        this.tailWag = 0;
        this.earFlop = 0;
        this.petCount = 0;
        this.happiness = 0;

        // Colors - felt material palette
        this.colors = {
            body: '#E8C4A0',
            dark: '#D4A574',
            lighter: '#F5DCC0',
            nose: '#8B7355',
            eye: '#4A3728',
            tongue: '#FFB6C1',
            accent: '#C8A882'
        };
    }

    update() {
        // Horizontal movement
        let moving = false;
        if (game.keys['ArrowLeft'] || game.keys['a'] || game.keys['A']) {
            this.x -= this.speed;
            moving = true;
        }
        if (game.keys['ArrowRight'] || game.keys['d'] || game.keys['D']) {
            this.x += this.speed;
            moving = true;
        }
        if (game.keys['ArrowUp'] || game.keys['w'] || game.keys['W']) {
            this.y -= this.speed;
        }
        if (game.keys['ArrowDown'] || game.keys['s'] || game.keys['S']) {
            this.y += this.speed;
        }

        // Jump
        if ((game.keys[' '] || game.keys['Space']) && !this.isJumping) {
            this.velocityY = this.jumpPower;
            this.isJumping = true;
            this.state = 'jumping';
            updateStatus('Whee! 🐕');
        }

        // Apply gravity
        if (this.y < this.groundY) {
            this.velocityY += this.gravity;
            this.y += this.velocityY;
        } else {
            this.y = this.groundY;
            this.velocityY = 0;
            if (this.isJumping) {
                this.isJumping = false;
                this.state = 'idle';
            }
        }

        // Update state
        if (!this.isJumping) {
            if (moving) {
                this.state = 'walking';
            } else if (this.happiness > 0) {
                this.state = 'happy';
                this.happiness--;
            } else {
                this.state = 'idle';
            }
        }

        // Keep in bounds
        this.x = Math.max(50, Math.min(game.width - 100, this.x));
        this.y = Math.max(50, Math.min(this.groundY, this.y));

        // Animation counters
        this.tailWag += 0.2;
        this.earFlop += 0.15;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Add subtle shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;

        // Tail (wagging)
        const tailX = this.state === 'happy' ? Math.sin(this.tailWag) * 8 : Math.sin(this.tailWag * 0.5) * 4;
        this.drawFeltShape(
            -25 + tailX, 10,
            20, 12,
            this.colors.accent,
            15
        );

        // Body (main felt shape)
        this.drawFeltShape(0, 0, this.width, this.height, this.colors.body, 25);

        // Legs
        this.drawFeltShape(-15, 40, 12, 25, this.colors.dark, 6);
        this.drawFeltShape(5, 40, 12, 25, this.colors.dark, 6);
        this.drawFeltShape(25, 40, 12, 25, this.colors.dark, 6);
        this.drawFeltShape(45, 40, 12, 25, this.colors.dark, 6);

        // Head
        this.drawFeltShape(50, -10, 45, 40, this.colors.lighter, 20);

        // Ears (flopping)
        const earFlop = this.state === 'happy' ? Math.sin(this.earFlop) * 3 : 0;
        this.drawFeltShape(48, -15 + earFlop, 15, 20, this.colors.accent, 10);
        this.drawFeltShape(78, -15 - earFlop, 15, 20, this.colors.accent, 10);

        // Eyes
        const eyeY = this.state === 'happy' ? -5 : 0;
        this.drawFeltCircle(60, 5 + eyeY, 4, this.colors.eye);
        this.drawFeltCircle(80, 5 + eyeY, 4, this.colors.eye);

        // Happy eyes
        if (this.state === 'happy') {
            ctx.strokeStyle = this.colors.eye;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(60, 5, 4, 0, Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(80, 5, 4, 0, Math.PI);
            ctx.stroke();
        }

        // Nose
        this.drawFeltShape(68, 15, 8, 6, this.colors.nose, 4);

        // Tongue (when happy)
        if (this.state === 'happy') {
            this.drawFeltShape(70, 22, 6, 10, this.colors.tongue, 3);
        }

        // Texture overlay for felt effect
        this.addFeltTexture();

        ctx.restore();
    }

    drawFeltShape(x, y, width, height, color, radius) {
        ctx.fillStyle = color;
        ctx.strokeStyle = this.darkenColor(color, 20);
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();
        ctx.stroke();

        // Add subtle highlight for depth
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    drawFeltCircle(x, y, radius, color) {
        ctx.fillStyle = color;
        ctx.strokeStyle = this.darkenColor(color, 20);
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    addFeltTexture() {
        // Create subtle noise texture for felt material
        const imageData = ctx.getImageData(this.x - 50, this.y - 50, 150, 120);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // Only affect non-transparent pixels
                const noise = (Math.random() - 0.5) * 10;
                data[i] += noise;
                data[i + 1] += noise;
                data[i + 2] += noise;
            }
        }

        ctx.putImageData(imageData, this.x - 50, this.y - 50);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    isClicked(mx, my) {
        return mx >= this.x - 25 && mx <= this.x + 100 &&
               my >= this.y - 25 && my <= this.y + 75;
    }

    pet() {
        this.petCount++;
        this.happiness = 100;
        this.state = 'happy';

        const messages = [
            'Good dog! 🐕',
            'The felt dog is so happy! 💕',
            'Woof woof! (tail wagging)',
            'Soft and fluffy! ✨',
            `Pet count: ${this.petCount} 🐾`
        ];
        updateStatus(messages[Math.floor(Math.random() * messages.length)]);
    }
}

// Initialize
const dog = new FeltDog(300, game.height - 100);

// Event Listeners
document.addEventListener('keydown', (e) => {
    game.keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    game.keys[e.key] = false;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (dog.isClicked(mx, my)) {
        dog.pet();
    }
});

// Helper function
function updateStatus(text) {
    statusText.textContent = text;
}

// Draw background
function drawBackground() {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, game.height);
    skyGradient.addColorStop(0, '#E8F4F8');
    skyGradient.addColorStop(1, '#D0E8F0');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, game.width, game.height);

    // Ground
    ctx.fillStyle = '#B8D4B8';
    ctx.fillRect(0, game.height - 80, game.width, 80);

    // Ground detail line
    ctx.strokeStyle = '#A0C4A0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, game.height - 80);
    ctx.lineTo(game.width, game.height - 80);
    ctx.stroke();

    // Simple grass tufts
    ctx.fillStyle = '#A0C4A0';
    for (let i = 0; i < 20; i++) {
        const x = (i * 40) + (Math.sin(Date.now() / 1000 + i) * 5);
        const y = game.height - 75;
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 15, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    drawCloud(150, 80, 60);
    drawCloud(400, 120, 80);
    drawCloud(650, 90, 70);
}

function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

// Game Loop
function gameLoop() {
    if (!game.running) return;

    // Clear and draw
    drawBackground();
    dog.update();
    dog.draw();

    requestAnimationFrame(gameLoop);
}

// Start Game
updateStatus('Click on the felt dog to pet it! Use arrow keys or WASD to move.');
gameLoop();
