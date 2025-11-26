// Unified App - Combines Game, AR Extractor, and 3D Viewer
// Tab Management and Feature Integration

// ===== TAB MANAGEMENT =====
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;

        // Update active states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        // Initialize features based on active tab
        if (targetTab === 'viewer' && !viewerInitialized) {
            initViewer();
        }
    });
});

// ===== AR EXTRACTOR FUNCTIONALITY =====
let bodyPixModel = null;
let isProcessing = false;
let isPaused = false;
let animationFrameId = null;
let recordedChunks = [];
let mediaRecorder = null;

const inputVideo = document.getElementById('inputVideo');
const outputCanvas = document.getElementById('outputCanvas');
const outputCtx = outputCanvas.getContext('2d');

const loadBtn = document.getElementById('loadBtn');
const processBtn = document.getElementById('processBtn');
const pauseBtn = document.getElementById('pauseBtn');
const downloadBtn = document.getElementById('downloadBtn');
const arStatusEl = document.getElementById('arStatus');
const loadingEl = document.getElementById('loading');

const segmentationScoreInput = document.getElementById('segmentationScore');
const segmentationScoreValue = document.getElementById('segmentationScoreValue');
const blurAmountInput = document.getElementById('blurAmount');
const blurAmountValue = document.getElementById('blurAmountValue');

let settings = {
    segmentationThreshold: 0.5,
    blurAmount: 5
};

// Update settings
segmentationScoreInput.addEventListener('input', (e) => {
    settings.segmentationThreshold = e.target.value / 100;
    segmentationScoreValue.textContent = settings.segmentationThreshold.toFixed(2);
});

blurAmountInput.addEventListener('input', (e) => {
    settings.blurAmount = parseInt(e.target.value);
    blurAmountValue.textContent = settings.blurAmount + 'px';
});

// Load video
loadBtn.addEventListener('click', () => {
    inputVideo.src = '🤐 2025-11-11 22.20.34.mp4';
    inputVideo.load();

    inputVideo.addEventListener('loadedmetadata', () => {
        outputCanvas.width = inputVideo.videoWidth;
        outputCanvas.height = inputVideo.videoHeight;
        updateARStatus('Video loaded! Click "Start Processing" to extract the dog.');
        processBtn.disabled = false;
    });

    inputVideo.addEventListener('error', (e) => {
        updateARStatus('Error loading video. Please check the file.');
        console.error('Video error:', e);
    });
});

// Load BodyPix model
async function loadModel() {
    if (bodyPixModel) return bodyPixModel;

    updateARStatus('Loading AI model...');
    loadingEl.classList.add('active');

    try {
        bodyPixModel = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2
        });

        loadingEl.classList.remove('active');
        updateARStatus('AI model loaded! Ready to process.');
        return bodyPixModel;
    } catch (error) {
        loadingEl.classList.remove('active');
        updateARStatus('Error loading AI model: ' + error.message);
        console.error('Model loading error:', error);
        throw error;
    }
}

// Start processing
processBtn.addEventListener('click', async () => {
    if (isProcessing) return;

    try {
        await loadModel();

        isProcessing = true;
        isPaused = false;
        processBtn.disabled = true;
        pauseBtn.disabled = false;
        loadBtn.disabled = true;

        inputVideo.play();
        processFrame();
        setupRecording();

        updateARStatus('Processing... Extracting dog and removing background.');
    } catch (error) {
        updateARStatus('Error: ' + error.message);
        isProcessing = false;
        processBtn.disabled = false;
    }
});

// Pause processing
pauseBtn.addEventListener('click', () => {
    if (isPaused) {
        isPaused = false;
        pauseBtn.textContent = '⏸️ Pause';
        inputVideo.play();
        processFrame();
        updateARStatus('Processing resumed...');
    } else {
        isPaused = true;
        pauseBtn.textContent = '▶️ Resume';
        inputVideo.pause();
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        updateARStatus('Processing paused.');
    }
});

// Process frames
async function processFrame() {
    if (!isProcessing || isPaused || inputVideo.paused || inputVideo.ended) {
        if (inputVideo.ended) {
            finishProcessing();
        }
        return;
    }

    try {
        const segmentation = await bodyPixModel.segmentPerson(inputVideo, {
            flipHorizontal: false,
            internalResolution: 'medium',
            segmentationThreshold: settings.segmentationThreshold
        });

        outputCtx.drawImage(inputVideo, 0, 0, outputCanvas.width, outputCanvas.height);
        const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
        const pixels = imageData.data;

        // Make background transparent
        for (let i = 0; i < segmentation.data.length; i++) {
            if (segmentation.data[i] === 0) {
                pixels[i * 4 + 3] = 0;
            }
        }

        if (settings.blurAmount > 0) {
            smoothEdges(imageData, segmentation.data, settings.blurAmount);
        }

        outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        outputCtx.putImageData(imageData, 0, 0);

        const progress = (inputVideo.currentTime / inputVideo.duration * 100).toFixed(1);
        updateARStatus(`Processing: ${progress}% - Dog extracted, background removed`);
    } catch (error) {
        console.error('Processing error:', error);
    }

    animationFrameId = requestAnimationFrame(processFrame);
}

// Smooth edges
function smoothEdges(imageData, mask, blurAmount) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    const alphaChannel = new Uint8ClampedArray(width * height);
    for (let i = 0; i < mask.length; i++) {
        alphaChannel[i] = mask[i] === 1 ? 255 : 0;
    }

    const blurred = boxBlur(alphaChannel, width, height, blurAmount);

    for (let i = 0; i < blurred.length; i++) {
        pixels[i * 4 + 3] = blurred[i];
    }
}

// Box blur
function boxBlur(data, width, height, radius) {
    const result = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;

            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const px = x + kx;
                    const py = y + ky;

                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        sum += data[py * width + px];
                        count++;
                    }
                }
            }

            result[y * width + x] = sum / count;
        }
    }

    return result;
}

// Setup recording
function setupRecording() {
    recordedChunks = [];

    try {
        const stream = outputCanvas.captureStream(30);
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 5000000
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            downloadBtn.disabled = false;
            updateARStatus('Processing complete! Click "Download Result" to save.');
        };

        mediaRecorder.start(100);
    } catch (error) {
        console.error('Recording setup error:', error);
    }
}

// Finish processing
function finishProcessing() {
    isProcessing = false;
    processBtn.disabled = false;
    pauseBtn.disabled = true;
    loadBtn.disabled = false;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

// Download video
downloadBtn.addEventListener('click', () => {
    if (recordedChunks.length === 0) {
        updateARStatus('No recording available. Please process the video again.');
        return;
    }

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dog-extracted-no-background.webm';
    a.click();
    URL.revokeObjectURL(url);

    updateARStatus('Video downloaded! The dog has been extracted with transparent background.');
});

function updateARStatus(message) {
    arStatusEl.textContent = message;
}

// ===== 3D VIEWER FUNCTIONALITY =====
let scene, camera, renderer, controls;
let videoPlane, videoTexture;
let video3D;
let rotationSpeed = 0;
let currentEnvironment = 0;
const environments = ['gradient', 'grid', 'particles'];
let viewerInitialized = false;

function initViewer() {
    if (viewerInitialized) return;
    viewerInitialized = true;

    const renderCanvas = document.getElementById('renderCanvas');

    // Scene
    scene = new THREE.Scene();
    updateEnvironment();

    // Camera
    camera = new THREE.PerspectiveCamera(75, renderCanvas.clientWidth / renderCanvas.clientHeight, 0.1, 1000);
    camera.position.z = 3;

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: renderCanvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(renderCanvas.clientWidth, renderCanvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 10;

    // Video
    video3D = document.createElement('video');
    video3D.src = '🤐 2025-11-11 22.20.34.mp4';
    video3D.loop = true;
    video3D.muted = true;
    video3D.crossOrigin = 'anonymous';

    // Video texture
    videoTexture = new THREE.VideoTexture(video3D);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    // Plane with video
    const geometry = new THREE.PlaneGeometry(2, 1.5);
    const material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
        transparent: true
    });
    videoPlane = new THREE.Mesh(geometry, material);
    scene.add(videoPlane);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Particles
    addParticles();

    // Event listeners
    setupViewerControls();

    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = renderCanvas.clientWidth / renderCanvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(renderCanvas.clientWidth, renderCanvas.clientHeight);
    });

    // Start animation
    animateViewer();
}

function addParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 500;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: 0x667eea,
        transparent: true,
        opacity: 0.6
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    particlesMesh.name = 'particles';
    scene.add(particlesMesh);
}

function updateEnvironment() {
    const env = environments[currentEnvironment];

    switch(env) {
        case 'gradient':
            scene.background = new THREE.Color(0x1a1a2e);
            scene.fog = new THREE.Fog(0x1a1a2e, 5, 15);
            break;
        case 'grid':
            scene.background = new THREE.Color(0x0f0f1e);
            addGridHelper();
            break;
        case 'particles':
            scene.background = new THREE.Color(0x000814);
            break;
    }
}

function addGridHelper() {
    const oldGrid = scene.getObjectByName('grid');
    if (oldGrid) scene.remove(oldGrid);

    const gridHelper = new THREE.GridHelper(10, 10, 0x667eea, 0x444444);
    gridHelper.position.y = -1.5;
    gridHelper.name = 'grid';
    scene.add(gridHelper);
}

function setupViewerControls() {
    document.getElementById('playBtn').addEventListener('click', () => {
        if (video3D.paused) {
            video3D.play();
            document.getElementById('playBtn').textContent = '⏸️ Pause';
        } else {
            video3D.pause();
            document.getElementById('playBtn').textContent = '▶️ Play';
        }
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        camera.position.set(0, 0, 3);
        controls.reset();
        videoPlane.rotation.set(0, 0, 0);
        videoPlane.position.set(0, 0, 0);
    });

    document.getElementById('environmentBtn').addEventListener('click', () => {
        currentEnvironment = (currentEnvironment + 1) % environments.length;
        updateEnvironment();
    });

    document.getElementById('scaleSlider').addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        videoPlane.scale.set(scale, scale, 1);
    });

    document.getElementById('heightSlider').addEventListener('input', (e) => {
        videoPlane.position.y = parseFloat(e.target.value);
    });

    document.getElementById('rotationSlider').addEventListener('input', (e) => {
        rotationSpeed = parseFloat(e.target.value);
    });
}

function animateViewer() {
    requestAnimationFrame(animateViewer);

    if (rotationSpeed > 0 && videoPlane) {
        videoPlane.rotation.y += rotationSpeed * 0.01;
    }

    const particles = scene.getObjectByName('particles');
    if (particles) {
        particles.rotation.y += 0.001;
        particles.rotation.x += 0.0005;
    }

    if (controls) controls.update();
    if (renderer) renderer.render(scene, camera);
}

// Initialize on load
console.log('Unified App loaded! Switch tabs to explore all features.');
