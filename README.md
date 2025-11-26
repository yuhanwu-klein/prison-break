# Prison Break - Interactive Felt Dog Game

An interactive game featuring a charming felt-style dog character with a plush wool aesthetic, now with advanced augmented reality features!

## Features

### Game Features
- **Felt-Style Dog Character**: Super soft cartoon aesthetic with wool felt material appearance
- **Interactive Gameplay**: Click and keyboard controls
- **Minimalist Design**: Clean, focused macro scene presentation
- **Tilt-shift Effect**: Axis shift photography style for depth

### AR Features (NEW! 🚀)
- **AI-Powered Background Removal**: Extract dog from video using TensorFlow.js
- **Real-time Video Processing**: Remove background and isolate dog motion
- **3D AR Viewer**: Interactive 3D environment with your extracted dog
- **Customizable Settings**: Adjust segmentation precision, edge smoothing, and more

## Getting Started

### Play the Game
Simply open `index.html` in a modern web browser to start playing!

### Extract Dog from Video (AR)
1. Open `ar-dog-extractor.html` in a modern web browser
2. Click "Load Video" to load your video (🤐 2025-11-11 22.20.34.mp4)
3. Click "Start Processing" to extract the dog and remove background
4. Adjust settings for better results:
   - **Segmentation Precision**: Controls how accurately the AI detects the dog
   - **Edge Smoothing**: Smooths the edges for a cleaner look
5. Click "Download Result" to save the processed video with transparent background

### View in 3D AR
1. Open `ar-3d-viewer.html` in a modern web browser
2. Click "Play" to start the video in 3D space
3. Interact with the scene:
   - **Drag**: Rotate the view
   - **Scroll**: Zoom in/out
   - **Right-click drag**: Pan the camera
4. Use the control panel to:
   - Adjust video size and height
   - Change rotation speed for auto-rotation
   - Switch between different environments

## Controls

- **Arrow Keys / WASD**: Move the felt dog
- **Mouse Click**: Interact with the dog (pet it!)
- **Space**: Make the dog jump

## Character Design

The felt dog features:
- Soft, plush wool felt material texture
- Cartoon-style proportions
- Minimalist color palette
- Hand-crafted felt aesthetic

## Future Expansions

This game is designed to be easily extensible. Future features could include:
- Additional felt characters
- Puzzles and challenges
- Collectible items
- Level progression
- Story elements

## Technology

### Game
- HTML5 Canvas for rendering
- Vanilla JavaScript for game logic
- CSS3 for styling and effects

### AR Features
- **TensorFlow.js**: Machine learning in the browser
- **BodyPix**: Real-time person segmentation model
- **Three.js**: 3D graphics and rendering
- **HTML5 Video API**: Video processing and playback
- **Canvas API**: Frame-by-frame video manipulation

## How It Works

### Background Removal Process
1. **Video Loading**: The video is loaded into an HTML5 video element
2. **AI Segmentation**: TensorFlow.js BodyPix model analyzes each frame to detect the dog
3. **Mask Generation**: Creates a segmentation mask separating foreground (dog) from background
4. **Background Removal**: Pixels identified as background are made transparent
5. **Edge Smoothing**: Optional blur applied to edges for smoother results
6. **Export**: Processed frames are captured and exported as a new video

### 3D AR Visualization
1. **Scene Setup**: Three.js creates a 3D scene with camera and lighting
2. **Video Texture**: The video is applied as a texture to a 3D plane
3. **Interactive Controls**: OrbitControls allow rotation, zoom, and pan
4. **Environment Effects**: Particles, grids, and lighting create an immersive AR experience

## Project Structure

```
prison-break/
├── index.html              # Main felt dog game
├── game.js                 # Game logic and rendering
├── style.css              # Game styling
├── ar-dog-extractor.html  # AR background removal tool
├── ar-processor.js        # Video processing logic
├── ar-3d-viewer.html      # 3D AR viewer
├── 🤐 2025-11-11 22.20.34.mp4  # Source video
└── README.md              # This file
```

## Browser Requirements

- Modern web browser with JavaScript enabled
- WebGL support for 3D AR viewer
- Recommended: Chrome, Firefox, or Edge (latest versions)
- Sufficient RAM for video processing (4GB+ recommended)

## Tips for Best Results

### Background Removal
- **Good lighting**: Videos with clear, even lighting work best
- **Contrast**: Higher contrast between dog and background improves segmentation
- **Adjust precision**: Lower values (0.3-0.4) for aggressive removal, higher values (0.6-0.7) for conservative
- **Edge smoothing**: 3-7px usually gives the best results

### 3D AR Viewer
- **Performance**: Close other browser tabs for smoother experience
- **Interaction**: Experiment with different environments for different moods
- **Auto-rotation**: Set rotation speed to 0.5-1.0 for a gentle spin
