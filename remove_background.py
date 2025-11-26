#!/usr/bin/env python3
"""
Video Background Removal Script
Removes the background from a video file using AI-based background removal.
"""

import cv2
import numpy as np
from rembg import remove
from PIL import Image
import os
import sys

def remove_video_background(input_path, output_path):
    """
    Remove background from video file.

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

    # Create temporary directory for frames
    temp_dir = "temp_frames"
    os.makedirs(temp_dir, exist_ok=True)

    frame_count = 0
    processed_frames = []

    print("Extracting and processing frames...")
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        print(f"Processing frame {frame_count}/{total_frames}...", end='\r')

        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Convert to PIL Image
        pil_image = Image.fromarray(frame_rgb)

        # Remove background
        output_image = remove(pil_image)

        # Save processed frame
        frame_path = os.path.join(temp_dir, f"frame_{frame_count:06d}.png")
        output_image.save(frame_path)
        processed_frames.append(frame_path)

    cap.release()
    print(f"\nProcessed {frame_count} frames")

    # Create output video with alpha channel using ffmpeg
    print("Creating output video...")

    # Use ffmpeg to combine frames into video with transparency
    ffmpeg_cmd = (
        f'ffmpeg -y -framerate {fps} '
        f'-i {temp_dir}/frame_%06d.png '
        f'-c:v png '
        f'-pix_fmt rgba '
        f'"{output_path}"'
    )

    os.system(ffmpeg_cmd)

    # Also create a WebM version with VP9 codec (better transparency support)
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
        os.remove(frame_path)
    os.rmdir(temp_dir)

    print(f"\n✅ Background removed successfully!")
    print(f"Output saved to: {output_path}")
    print(f"WebM version: {webm_output}")

if __name__ == "__main__":
    input_video = "🤐 2025-11-11 22.20.34.mp4"
    output_video = "🤐 2025-11-11 22.20.34_no_bg.mov"

    if not os.path.exists(input_video):
        print(f"Error: Input video '{input_video}' not found!")
        sys.exit(1)

    remove_video_background(input_video, output_video)
