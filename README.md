# Prison Break - Dog Gesture Adventure

An interactive gesture-controlled game featuring a real dog with background removal, hand gesture detection, and dynamic gameplay elements.

## Features

### Main Game Scene
- **Real Dog Video Sprite**: Uses actual dog video with AI-powered background removal via TensorFlow.js
- **Multiple Backgrounds**: 5 beautiful gradient backgrounds that cycle when you click the canvas
  - Sky Blue
  - Grass Green
  - Sandy Beach
  - Lavender Field
  - Pink Garden
- **Bone Collection**: 10 randomly placed bones that disappear when the dog approaches them
- **Moving Shadow**: An animated person shadow that moves across the foreground
- **Collision Detection**: Advanced collision system between dog, bones, and shadow

### Camera Scene
- **Scene Transition**: When the shadow catches the dog eating a bone, the game transitions to a special scene
- **Hand Gesture Detection**: Uses MediaPipe Hands to detect hand movements via webcam
- **Screen Shake Effect**: Moving your hands causes the entire screen to shake dynamically
- **Special Background**: Displays the WechatIMG561.jpg image in the second scene
- **Live Webcam Feed**: Shows your camera feed in the corner while detecting gestures

## Getting Started

1. Open `index.html` in a modern web browser (Chrome or Edge recommended)
2. Allow camera permissions when prompted (for gesture detection in second scene)
3. Wait for TensorFlow models to load
4. Play the game!

## Controls

### Main Scene
- **Arrow Keys / WASD**: Move the dog around the screen
- **Click Canvas**: Change the background image
- **Collect Bones**: Move the dog close to bones to collect them
- **Avoid Shadow**: Don't let the shadow catch you while eating!

### Camera Scene
- **Hand Gestures**: Wave your hands in front of the camera to shake the screen
- **Arrow Keys / WASD**: Continue to move the dog
- **Escape**: (Feature can be added to return to main scene)

## Gameplay Flow

1. **Start**: The dog appears with removed background from the uploaded video
2. **Explore**: Move around and collect all 10 bones scattered across the background
3. **Challenge**: A moving shadow patrols the foreground
4. **Transition**: If the shadow overlaps with the dog while eating a bone, scene changes
5. **Gesture Mode**: Use hand movements to interact with the new scene
6. **Screen Effects**: Your hand gestures cause dynamic screen shaking

## Technology Stack

- **TensorFlow.js**: AI-powered person segmentation for background removal
- **MediaPipe Hands**: Real-time hand landmark detection and tracking
- **Body Segmentation**: Advanced segmentation model for video processing
- **HTML5 Canvas**: High-performance 2D rendering
- **Vanilla JavaScript**: Pure JS for game logic and interactions
- **CSS3**: Modern styling and effects

## Technical Features

- **Real-time Background Removal**: Processes video frames at ~15 FPS to remove background
- **Frame Buffering**: Keeps last 30 processed frames for smooth animation
- **Gesture Recognition**: Tracks hand position and movement speed
- **Dynamic Shake Effect**: Intensity-based screen shake with decay
- **Multi-scene Management**: Seamless transition between game states
- **Collision Detection**: Distance-based collision for bones and shadow overlap
- **Asset Management**: Async loading of models, videos, and images

## Browser Requirements

- Modern browser with WebGL support (Chrome 90+, Edge 90+, Firefox 88+)
- Webcam access for hand gesture features
- ~50MB memory for TensorFlow models
- Hardware acceleration recommended for smooth performance

## Files

- `index.html`: Main game page with library imports
- `game.js`: Complete game logic and AI processing
- `style.css`: Visual styling and responsive design
- `🤐 2025-11-11 22.20.34.mp4`: Dog video for sprite animation
- `WechatIMG561.jpg`: Special background for camera scene

## Future Enhancements

- Add score tracking and timer
- Multiple difficulty levels
- More gesture types (pinch, swipe, etc.)
- Additional dog videos and characters
- Sound effects and background music
- Mobile touch controls
- Multiplayer mode with dual hand tracking
