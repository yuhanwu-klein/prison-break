#!/usr/bin/env python3
"""
Video Background Removal Script using OpenCV
Removes the background from a video file using OpenCV's background subtraction.
"""

import cv2
import numpy as np
import os
import sys

def remove_video_background_opencv(input_path, output_path):
    """
    Remove background from video file using OpenCV background subtraction.

    Args:
        input_path: Path to input video file
        output_path: Path to output video file (with transparency)
    """
    print(f"Processing video: {input_path}")

    # Open the video
    cap = cv2.VideoCapture(input_path)

    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"Video properties: {width}x{height} @ {fps}fps, {total_frames} frames")

    # Create background subtractor
    # MOG2 is a Gaussian Mixture-based Background/Foreground Segmentation Algorithm
    backSub = cv2.createBackgroundSubtractorMOG2(
        history=500,
        varThreshold=16,
        detectShadows=True
    )

    # Create temporary directory for frames
    temp_dir = "temp_frames_opencv"
    os.makedirs(temp_dir, exist_ok=True)

    frame_count = 0
    processed_frames = []

    print("Extracting and processing frames...")

    # First pass: Learn the background
    print("Learning background pattern...")
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    for i in range(min(50, total_frames)):  # Use first 50 frames to learn background
        ret, frame = cap.read()
        if not ret:
            break
        backSub.apply(frame, learningRate=0.5)

    # Second pass: Process all frames
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        print(f"Processing frame {frame_count}/{total_frames}...", end='\r')

        # Apply background subtraction
        fgMask = backSub.apply(frame, learningRate=0.01)

        # Refine the mask
        # Remove shadows (they are labeled as 127)
        fgMask[fgMask == 127] = 0

        # Apply morphological operations to clean up the mask
        kernel = np.ones((3, 3), np.uint8)
        fgMask = cv2.morphologyEx(fgMask, cv2.MORPH_CLOSE, kernel, iterations=2)
        fgMask = cv2.morphologyEx(fgMask, cv2.MORPH_OPEN, kernel, iterations=1)

        # Apply Gaussian blur to smooth edges
        fgMask = cv2.GaussianBlur(fgMask, (5, 5), 0)

        # Create RGBA image
        b, g, r = cv2.split(frame)
        rgba = cv2.merge((r, g, b, fgMask))

        # Save processed frame
        frame_path = os.path.join(temp_dir, f"frame_{frame_count:06d}.png")
        cv2.imwrite(frame_path, rgba)
        processed_frames.append(frame_path)

    cap.release()
    print(f"\nProcessed {frame_count} frames")

    # Create output video with alpha channel using ffmpeg
    print("Creating output video...")

    # Create MOV with transparency (ProRes 4444)
    mov_output = output_path
    mov_cmd = (
        f'ffmpeg -y -framerate {fps} '
        f'-i {temp_dir}/frame_%06d.png '
        f'-c:v png '
        f'-pix_fmt rgba '
        f'"{mov_output}"'
    )
    os.system(mov_cmd)

    # Also create a WebM version with VP9 codec (better transparency support for web)
    webm_output = output_path.replace('.mp4', '.webm').replace('.mov', '.webm')
    webm_cmd = (
        f'ffmpeg -y -framerate {fps} '
        f'-i {temp_dir}/frame_%06d.png '
        f'-c:v libvpx-vp9 '
        f'-pix_fmt yuva420p '
        f'-auto-alt-ref 0 '
        f'"{webm_output}"'
    )
    os.system(webm_cmd)

    # Clean up temporary frames
    print("Cleaning up temporary files...")
    for frame_path in processed_frames:
        try:
            os.remove(frame_path)
        except:
            pass
    try:
        os.rmdir(temp_dir)
    except:
        pass

    print(f"\n✅ Background removed successfully!")
    print(f"Output saved to: {mov_output}")
    print(f"WebM version: {webm_output}")
    print(f"\nNote: This uses motion-based background subtraction.")
    print(f"For best results, the camera should be stationary and the subject should be moving.")

def remove_video_background_chroma(input_path, output_path, target_color='green'):
    """
    Remove background from video using chroma key (color-based removal).

    Args:
        input_path: Path to input video file
        output_path: Path to output video file
        target_color: 'green' or 'blue' for chroma key
    """
    print(f"Processing video with chroma key: {input_path}")

    cap = cv2.VideoCapture(input_path)

    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"Video properties: {width}x{height} @ {fps}fps, {total_frames} frames")

    # Create temporary directory for frames
    temp_dir = "temp_frames_chroma"
    os.makedirs(temp_dir, exist_ok=True)

    frame_count = 0
    processed_frames = []

    # Define color range for chroma key
    if target_color == 'green':
        lower = np.array([35, 40, 40])   # Lower HSV bound for green
        upper = np.array([85, 255, 255])  # Upper HSV bound for green
    elif target_color == 'blue':
        lower = np.array([100, 40, 40])   # Lower HSV bound for blue
        upper = np.array([130, 255, 255]) # Upper HSV bound for blue
    else:
        # Try to detect dominant background color from first frame
        ret, first_frame = cap.read()
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        hsv = cv2.cvtColor(first_frame, cv2.COLOR_BGR2HSV)
        # Use color from corners (likely background)
        corners = [hsv[0, 0], hsv[0, -1], hsv[-1, 0], hsv[-1, -1]]
        avg_hue = int(np.mean([c[0] for c in corners]))
        lower = np.array([max(0, avg_hue - 20), 40, 40])
        upper = np.array([min(180, avg_hue + 20), 255, 255])

    print("Processing frames with color-based background removal...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        print(f"Processing frame {frame_count}/{total_frames}...", end='\r')

        # Convert to HSV for better color selection
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Create mask for background color
        mask = cv2.inRange(hsv, lower, upper)

        # Invert mask (we want to keep foreground)
        mask = cv2.bitwise_not(mask)

        # Refine mask
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        mask = cv2.GaussianBlur(mask, (5, 5), 0)

        # Create RGBA image
        b, g, r = cv2.split(frame)
        rgba = cv2.merge((r, g, b, mask))

        # Save frame
        frame_path = os.path.join(temp_dir, f"frame_{frame_count:06d}.png")
        cv2.imwrite(frame_path, rgba)
        processed_frames.append(frame_path)

    cap.release()
    print(f"\nProcessed {frame_count} frames")

    # Create output video
    print("Creating output video...")

    webm_output = output_path.replace('.mp4', '.webm').replace('.mov', '.webm')
    webm_cmd = (
        f'ffmpeg -y -framerate {fps} '
        f'-i {temp_dir}/frame_%06d.png '
        f'-c:v libvpx-vp9 '
        f'-pix_fmt yuva420p '
        f'-auto-alt-ref 0 '
        f'"{webm_output}"'
    )
    os.system(webm_cmd)

    # Clean up
    print("Cleaning up temporary files...")
    for frame_path in processed_frames:
        try:
            os.remove(frame_path)
        except:
            pass
    try:
        os.rmdir(temp_dir)
    except:
        pass

    print(f"\n✅ Background removed successfully!")
    print(f"WebM output: {webm_output}")

if __name__ == "__main__":
    input_video = "🤐 2025-11-11 22.20.34.mp4"
    output_video = "🤐 2025-11-11 22.20.34_no_bg.mov"

    if not os.path.exists(input_video):
        print(f"Error: Input video '{input_video}' not found!")
        sys.exit(1)

    # Try motion-based background subtraction first
    print("=" * 60)
    print("Using motion-based background subtraction")
    print("=" * 60)
    remove_video_background_opencv(input_video, output_video)

    # Optionally, also try chroma key if you know the background color
    # Uncomment one of these if the video has a solid color background:
    # remove_video_background_chroma(input_video, output_video.replace('.mov', '_chroma.mov'), 'green')
    # remove_video_background_chroma(input_video, output_video.replace('.mov', '_chroma.mov'), 'blue')
