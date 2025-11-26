// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('statusText');

// Video elements
const dogVideo = document.getElementById('dogVideo');
const videoCanvas = document.getElementById('videoCanvas');
const videoCtx = videoCanvas.getContext('2d');
const webcam = document.getElementById('webcam');
const handCanvas = document.getElementById('handCanvas');
const handCtx = handCanvas.getContext('2d');

// Game State
const game = {
    width: 800,
    height: 600,
    running: false,
    keys: {},
    currentScene: 'main', // 'main' or 'camera'
    backgroundIndex: 0,
    shakeOffset: { x: 0, y: 0 },
    shakeIntensity: 0,
    segmenter: null,
    hands: null,
    camera: null,
    assetsLoaded: false
};

// Background images (programmatically generated + user image)
const backgrounds = [];
let specialBackground = null; // WechatIMG561.jpg

// Dog sprite
const dog = {
    x: 400,
    y: 300,
    width: 120,
    height: 120,
    speed: 5,
    frame: 0,
    frames: [], // Will store processed video frames
    currentFrameIndex: 0,
    isEating: false
};

// Bones
const bones = [];
const MAX_BONES = 10;

// Shadow
const shadow = {
    x: 600,
    y: 200,
    width: 100,
    height: 150,
    speed: 2,
    direction: 1,
    alpha: 0.4
};

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    updateStatus('Loading TensorFlow models...');

    try {
        // Load BodySegmentation model for background removal
        const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
        game.segmenter = await bodySegmentation.createSegmenter(model, {
            runtime: 'tfjs',
            modelType: 'general'
        });

        updateStatus('Loading dog video...');

        // Load dog video
        dogVideo.src = '🤐 2025-11-11 22.20.34.mp4';
        await new Promise((resolve, reject) => {
            dogVideo.onloadeddata = resolve;
            dogVideo.onerror = reject;
        });
        dogVideo.play();

        updateStatus('Loading backgrounds...');

        // Generate background images
        await generateBackgrounds();

        // Load special background
        await loadSpecialBackground();

        updateStatus('Generating bones...');

        // Generate initial bones
        generateBones();

        updateStatus('Initializing hand detection...');

        // Initialize MediaPipe Hands (but don't start camera yet)
        await initHandDetection();

        game.assetsLoaded = true;
        game.running = true;

        updateStatus('Game ready! Move the dog with arrow keys, click to change background, collect bones!');

        // Start processing video frames
        processVideoFrame();

        // Start game loop
        gameLoop();

    } catch (error) {
        console.error('Initialization error:', error);
        updateStatus('Error loading game: ' + error.message);
    }
}

// ============================================
// BACKGROUND MANAGEMENT
// ============================================

async function generateBackgrounds() {
    // Create 5 different background images
    const bgPatterns = [
        { colors: ['#87CEEB', '#E0F6FF'], name: 'Sky Blue' },
        { colors: ['#90EE90', '#C8E6C9'], name: 'Grass Green' },
        { colors: ['#FFE4B5', '#FFF8DC'], name: 'Sandy Beach' },
        { colors: ['#DDA0DD', '#F0E6F0'], name: 'Lavender Field' },
        { colors: ['#FFB6C1', '#FFE4E1'], name: 'Pink Garden' }
    ];

    for (let pattern of bgPatterns) {
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = game.width;
        bgCanvas.height = game.height;
        const bgCtx = bgCanvas.getContext('2d');

        // Create gradient background
        const gradient = bgCtx.createLinearGradient(0, 0, 0, game.height);
        gradient.addColorStop(0, pattern.colors[0]);
        gradient.addColorStop(1, pattern.colors[1]);
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, game.width, game.height);

        // Add some decorative elements
        bgCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * game.width;
            const y = Math.random() * game.height * 0.5;
            const size = 30 + Math.random() * 40;
            bgCtx.beginPath();
            bgCtx.arc(x, y, size, 0, Math.PI * 2);
            bgCtx.fill();
        }

        backgrounds.push({
            image: bgCanvas,
            name: pattern.name
        });
    }
}

async function loadSpecialBackground() {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            specialBackground = img;
            resolve();
        };
        img.onerror = () => {
            console.warn('Could not load WechatIMG561.jpg, using generated background');
            resolve();
        };
        img.src = 'WechatIMG561.jpg';
    });
}

function changeBackground() {
    if (game.currentScene === 'main') {
        game.backgroundIndex = (game.backgroundIndex + 1) % backgrounds.length;
        updateStatus(`Background changed to: ${backgrounds[game.backgroundIndex].name}`);
    }
}

// ============================================
// VIDEO PROCESSING & BACKGROUND REMOVAL
// ============================================

async function processVideoFrame() {
    if (!game.running || !game.segmenter) return;

    try {
        // Draw current video frame
        videoCtx.drawImage(dogVideo, 0, 0, videoCanvas.width, videoCanvas.height);

        // Get segmentation
        const segmentation = await game.segmenter.segmentPeople(videoCanvas, {
            flipHorizontal: false,
            multiSegmentation: false,
            segmentBodyParts: false
        });

        // Create mask
        const imageData = videoCtx.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
        const data = imageData.data;
        const mask = await segmentation[0].mask.toImageData();

        // Apply mask to remove background
        for (let i = 0; i < mask.data.length; i += 4) {
            const alpha = mask.data[i];
            if (alpha < 128) {
                // Background pixel - make transparent
                data[i + 3] = 0;
            }
        }

        videoCtx.putImageData(imageData, 0, 0);

        // Store frame for dog sprite
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = videoCanvas.width;
        frameCanvas.height = videoCanvas.height;
        const frameCtx = frameCanvas.getContext('2d');
        frameCtx.drawImage(videoCanvas, 0, 0);

        // Keep only last 30 frames to manage memory
        dog.frames.push(frameCanvas);
        if (dog.frames.length > 30) {
            dog.frames.shift();
        }

    } catch (error) {
        console.error('Video processing error:', error);
    }

    // Continue processing at ~15 FPS
    setTimeout(() => processVideoFrame(), 66);
}

// ============================================
// BONES
// ============================================

function generateBones() {
    bones.length = 0;
    for (let i = 0; i < MAX_BONES; i++) {
        bones.push({
            x: Math.random() * (game.width - 40) + 20,
            y: Math.random() * (game.height - 40) + 20,
            width: 30,
            height: 15,
            collected: false
        });
    }
}

function drawBone(x, y) {
    ctx.fillStyle = '#F5F5DC';
    ctx.strokeStyle = '#D2B48C';
    ctx.lineWidth = 2;

    // Draw bone shape
    ctx.beginPath();
    // Left circle
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center rectangle
    ctx.fillRect(x - 2, y - 3, 24, 6);
    ctx.strokeRect(x - 2, y - 3, 24, 6);

    // Right circle
    ctx.beginPath();
    ctx.arc(x + 20, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function checkBoneCollision() {
    for (let bone of bones) {
        if (!bone.collected) {
            const dx = dog.x - bone.x;
            const dy = dog.y - bone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 60) {
                bone.collected = true;
                dog.isEating = true;
                updateStatus('Yum! Bone collected! 🦴');
                setTimeout(() => { dog.isEating = false; }, 1000);
                return true;
            }
        }
    }
    return false;
}

// ============================================
// SHADOW
// ============================================

function updateShadow() {
    // Move shadow back and forth
    shadow.x += shadow.speed * shadow.direction;

    if (shadow.x > game.width - shadow.width || shadow.x < 0) {
        shadow.direction *= -1;
    }

    // Also move vertically slowly
    shadow.y += Math.sin(Date.now() / 1000) * 0.5;
    shadow.y = Math.max(50, Math.min(game.height - shadow.height - 50, shadow.y));
}

function drawShadow() {
    ctx.save();
    ctx.globalAlpha = shadow.alpha;
    ctx.fillStyle = '#000000';

    // Draw person-like shadow
    ctx.beginPath();
    // Head
    ctx.arc(shadow.x + shadow.width / 2, shadow.y + 20, 15, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillRect(shadow.x + shadow.width / 2 - 20, shadow.y + 35, 40, 60);

    // Arms
    ctx.fillRect(shadow.x + shadow.width / 2 - 40, shadow.y + 40, 20, 40);
    ctx.fillRect(shadow.x + shadow.width / 2 + 20, shadow.y + 40, 20, 40);

    // Legs
    ctx.fillRect(shadow.x + shadow.width / 2 - 15, shadow.y + 95, 12, 50);
    ctx.fillRect(shadow.x + shadow.width / 2 + 3, shadow.y + 95, 12, 50);

    ctx.restore();
}

function checkShadowCollision() {
    if (!dog.isEating) return false;

    const dogCenterX = dog.x + dog.width / 2;
    const dogCenterY = dog.y + dog.height / 2;

    const shadowCenterX = shadow.x + shadow.width / 2;
    const shadowCenterY = shadow.y + shadow.height / 2;

    const dx = dogCenterX - shadowCenterX;
    const dy = dogCenterY - shadowCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < 80;
}

// ============================================
// HAND DETECTION
// ============================================

async function initHandDetection() {
    try {
        if (typeof Hands === 'undefined') {
            console.warn('MediaPipe Hands not loaded');
            return;
        }

        game.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
            }
        });

        game.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        game.hands.onResults(onHandsDetected);

    } catch (error) {
        console.error('Hand detection init error:', error);
    }
}

let lastHandPosition = null;

function onHandsDetected(results) {
    if (game.currentScene !== 'camera') return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        const wrist = hand[0];

        if (lastHandPosition) {
            const dx = wrist.x - lastHandPosition.x;
            const dy = wrist.y - lastHandPosition.y;
            const movement = Math.sqrt(dx * dx + dy * dy);

            // If hand moved significantly, trigger shake
            if (movement > 0.05) {
                game.shakeIntensity = Math.min(20, movement * 100);
            }
        }

        lastHandPosition = { x: wrist.x, y: wrist.y };
    }
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });

        webcam.srcObject = stream;

        if (game.hands) {
            game.camera = new Camera(webcam, {
                onFrame: async () => {
                    if (game.hands) {
                        await game.hands.send({ image: webcam });
                    }
                },
                width: 640,
                height: 480
            });

            game.camera.start();
        }

        updateStatus('Camera active! Move your hands to shake the screen!');

    } catch (error) {
        console.error('Camera error:', error);
        updateStatus('Could not access camera: ' + error.message);
    }
}

// ============================================
// DOG MOVEMENT
// ============================================

function updateDog() {
    // Keyboard controls
    if (game.keys['ArrowLeft'] || game.keys['a'] || game.keys['A']) {
        dog.x -= dog.speed;
    }
    if (game.keys['ArrowRight'] || game.keys['d'] || game.keys['D']) {
        dog.x += dog.speed;
    }
    if (game.keys['ArrowUp'] || game.keys['w'] || game.keys['W']) {
        dog.y -= dog.speed;
    }
    if (game.keys['ArrowDown'] || game.keys['s'] || game.keys['S']) {
        dog.y += dog.speed;
    }

    // Keep in bounds
    dog.x = Math.max(0, Math.min(game.width - dog.width, dog.x));
    dog.y = Math.max(0, Math.min(game.height - dog.height, dog.y));

    // Update animation frame
    if (dog.frames.length > 0) {
        dog.currentFrameIndex = (dog.currentFrameIndex + 1) % dog.frames.length;
    }

    // Check bone collision
    checkBoneCollision();

    // Check shadow collision when eating
    if (checkShadowCollision()) {
        transitionToCameraScene();
    }
}

function drawDog() {
    if (dog.frames.length === 0) {
        // Draw placeholder if video not ready
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(dog.x, dog.y, dog.width, dog.height);
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.fillText('🐕', dog.x + 40, dog.y + 70);
    } else {
        // Draw current video frame
        ctx.drawImage(
            dog.frames[dog.currentFrameIndex],
            dog.x, dog.y,
            dog.width, dog.height
        );
    }
}

// ============================================
// SCENE MANAGEMENT
// ============================================

function transitionToCameraScene() {
    if (game.currentScene === 'camera') return;

    game.currentScene = 'camera';
    updateStatus('Caught by the shadow! Starting camera mode...');

    // Start camera and hand detection
    startCamera();
}

// ============================================
// SHAKE EFFECT
// ============================================

function updateShake() {
    if (game.shakeIntensity > 0) {
        game.shakeOffset.x = (Math.random() - 0.5) * game.shakeIntensity;
        game.shakeOffset.y = (Math.random() - 0.5) * game.shakeIntensity;
        game.shakeIntensity *= 0.9; // Decay

        if (game.shakeIntensity < 0.5) {
            game.shakeIntensity = 0;
            game.shakeOffset.x = 0;
            game.shakeOffset.y = 0;
        }
    }
}

// ============================================
// DRAWING
// ============================================

function drawMainScene() {
    // Draw background
    if (backgrounds[game.backgroundIndex]) {
        ctx.drawImage(backgrounds[game.backgroundIndex].image, 0, 0);
    }

    // Draw bones
    for (let bone of bones) {
        if (!bone.collected) {
            drawBone(bone.x, bone.y);
        }
    }

    // Draw dog
    drawDog();

    // Draw shadow on foreground
    drawShadow();
}

function drawCameraScene() {
    // Draw special background or default
    if (specialBackground) {
        ctx.drawImage(specialBackground, 0, 0, game.width, game.height);
    } else {
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(0, 0, game.width, game.height);
    }

    // Draw webcam feed (small in corner)
    if (webcam.srcObject) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(webcam, game.width - 210, 10, 200, 150);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.strokeRect(game.width - 210, 10, 200, 150);
        ctx.restore();
    }

    // Draw dog (still moveable)
    drawDog();

    // Draw status text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Wave your hands to shake the screen!', game.width / 2, 50);
    ctx.textAlign = 'left';
}

// ============================================
// GAME LOOP
// ============================================

function gameLoop() {
    if (!game.running) return;

    ctx.save();

    // Apply shake effect
    updateShake();
    ctx.translate(game.shakeOffset.x, game.shakeOffset.y);

    // Clear canvas
    ctx.clearRect(-50, -50, game.width + 100, game.height + 100);

    // Update and draw based on scene
    if (game.currentScene === 'main') {
        updateDog();
        updateShadow();
        drawMainScene();
    } else {
        updateDog();
        drawCameraScene();
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('keydown', (e) => {
    game.keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    game.keys[e.key] = false;
});

canvas.addEventListener('click', () => {
    changeBackground();
});

// Helper function
function updateStatus(text) {
    statusText.textContent = text;
}

// ============================================
// START GAME
// ============================================

init();
