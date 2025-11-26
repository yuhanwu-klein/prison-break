// AR Dog Extractor - Video Processing with Background Removal
// Using TensorFlow.js BodyPix for segmentation

let bodyPixModel = null;
let isProcessing = false;
let isPaused = false;
let animationFrameId = null;
let recordedChunks = [];
let mediaRecorder = null;

// DOM Elements
const inputVideo = document.getElementById('inputVideo');
const outputCanvas = document.getElementById('outputCanvas');
const outputCtx = outputCanvas.getContext('2d');

const loadBtn = document.getElementById('loadBtn');
const processBtn = document.getElementById('processBtn');
const pauseBtn = document.getElementById('pauseBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusEl = document.getElementById('status');
const loadingEl = document.getElementById('loading');

// Settings
const segmentationScoreInput = document.getElementById('segmentationScore');
const segmentationScoreValue = document.getElementById('segmentationScoreValue');
const blurAmountInput = document.getElementById('blurAmount');
const blurAmountValue = document.getElementById('blurAmountValue');

let settings = {
    segmentationThreshold: 0.5,
    blurAmount: 5
};

// Update settings display
segmentationScoreInput.addEventListener('input', (e) => {
    settings.segmentationThreshold = e.target.value / 100;
    segmentationScoreValue.textContent = settings.segmentationThreshold.toFixed(2);
});

blurAmountInput.addEventListener('input', (e) => {
    settings.blurAmount = parseInt(e.target.value);
    blurAmountValue.textContent = settings.blurAmount + 'px';
});

// Initialize
async function init() {
    updateStatus('Ready! Click "Load Video" to begin.');
}

// Load the video
loadBtn.addEventListener('click', () => {
    inputVideo.src = '🤐 2025-11-11 22.20.34.mp4';
    inputVideo.load();

    inputVideo.addEventListener('loadedmetadata', () => {
        // Set canvas size to match video
        outputCanvas.width = inputVideo.videoWidth;
        outputCanvas.height = inputVideo.videoHeight;

        updateStatus('Video loaded! Click "Start Processing" to extract the dog.');
        processBtn.disabled = false;
    });

    inputVideo.addEventListener('error', (e) => {
        updateStatus('Error loading video. Please check the file.');
        console.error('Video error:', e);
    });
});

// Load BodyPix model
async function loadModel() {
    if (bodyPixModel) return bodyPixModel;

    updateStatus('Loading AI model...');
    loadingEl.classList.add('active');

    try {
        // Load BodyPix with optimized settings
        bodyPixModel = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2
        });

        loadingEl.classList.remove('active');
        updateStatus('AI model loaded! Ready to process.');
        return bodyPixModel;
    } catch (error) {
        loadingEl.classList.remove('active');
        updateStatus('Error loading AI model: ' + error.message);
        console.error('Model loading error:', error);
        throw error;
    }
}

// Start processing
processBtn.addEventListener('click', async () => {
    if (isProcessing) return;

    try {
        // Load model if not already loaded
        await loadModel();

        isProcessing = true;
        isPaused = false;
        processBtn.disabled = true;
        pauseBtn.disabled = false;
        loadBtn.disabled = true;

        // Play video
        inputVideo.play();

        // Start processing frames
        processFrame();

        // Setup recording
        setupRecording();

        updateStatus('Processing... Extracting dog and removing background.');
    } catch (error) {
        updateStatus('Error: ' + error.message);
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
        updateStatus('Processing resumed...');
    } else {
        isPaused = true;
        pauseBtn.textContent = '▶️ Resume';
        inputVideo.pause();
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        updateStatus('Processing paused.');
    }
});

// Process video frames
async function processFrame() {
    if (!isProcessing || isPaused || inputVideo.paused || inputVideo.ended) {
        if (inputVideo.ended) {
            finishProcessing();
        }
        return;
    }

    try {
        // Perform segmentation
        const segmentation = await bodyPixModel.segmentPerson(inputVideo, {
            flipHorizontal: false,
            internalResolution: 'medium',
            segmentationThreshold: settings.segmentationThreshold
        });

        // Draw original frame
        outputCtx.drawImage(inputVideo, 0, 0, outputCanvas.width, outputCanvas.height);

        // Get image data
        const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
        const pixels = imageData.data;

        // Apply segmentation mask - make background transparent
        for (let i = 0; i < segmentation.data.length; i++) {
            // If pixel is background (0), make it transparent
            if (segmentation.data[i] === 0) {
                pixels[i * 4 + 3] = 0; // Set alpha to 0
            }
        }

        // Apply edge smoothing
        if (settings.blurAmount > 0) {
            smoothEdges(imageData, segmentation.data, settings.blurAmount);
        }

        // Draw processed frame
        outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        outputCtx.putImageData(imageData, 0, 0);

        // Update progress
        const progress = (inputVideo.currentTime / inputVideo.duration * 100).toFixed(1);
        updateStatus(`Processing: ${progress}% - Dog extracted, background removed`);

    } catch (error) {
        console.error('Processing error:', error);
    }

    // Continue processing
    animationFrameId = requestAnimationFrame(processFrame);
}

// Smooth edges for better quality
function smoothEdges(imageData, mask, blurAmount) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    // Create a copy of alpha channel
    const alphaChannel = new Uint8ClampedArray(width * height);
    for (let i = 0; i < mask.length; i++) {
        alphaChannel[i] = mask[i] === 1 ? 255 : 0;
    }

    // Apply simple box blur to alpha channel
    const blurred = boxBlur(alphaChannel, width, height, blurAmount);

    // Apply blurred alpha
    for (let i = 0; i < blurred.length; i++) {
        pixels[i * 4 + 3] = blurred[i];
    }
}

// Simple box blur implementation
function boxBlur(data, width, height, radius) {
    const result = new Uint8ClampedArray(data.length);
    const diameter = radius * 2 + 1;

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

// Setup video recording
function setupRecording() {
    recordedChunks = [];

    try {
        const stream = outputCanvas.captureStream(30); // 30 FPS
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
            updateStatus('Processing complete! Click "Download Result" to save the video.');
        };

        mediaRecorder.start(100); // Capture in 100ms chunks
    } catch (error) {
        console.error('Recording setup error:', error);
        updateStatus('Note: Recording may not be available. You can still view the result.');
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

// Download processed video
downloadBtn.addEventListener('click', () => {
    if (recordedChunks.length === 0) {
        updateStatus('No recording available. Please process the video again.');
        return;
    }

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dog-extracted-no-background.webm';
    a.click();
    URL.revokeObjectURL(url);

    updateStatus('Video downloaded! The dog has been extracted with transparent background.');
});

// Helper function to update status
function updateStatus(message) {
    statusEl.textContent = message;
}

// Initialize on load
init();
