# SoundScapes: Synesthesia Composer

This project is a web-based application designed to offer a real-time, synesthetic experience by converting user drawings into dynamic soundscapes. The application allows a user to draw shapes and lines on a canvas, where attributes like position, color, and size are instantly mapped to musical parameters (e.g., pitch, duration, and timbre). The purpose is to provide an artistic tool that merges visual design and musical composition in a unique, accessible way. It addresses the limitation of traditional digital art tools and music sequencers by creating a direct, real-time feedback loop between visual input and audio output, turning simple drawing actions into meaningful, evolving sound art.
<img width="1599" height="937" alt="image" src="https://github.com/user-attachments/assets/ba879961-20ac-4a08-a88b-68b5104e7cbd" />


## Project Summary

SoundScapes is a cross-platform desktop application that explores the concept of **synesthesia**—translating visual data into audio experiences. Users draw shapes on a digital canvas, and the application interprets the geometry, color, and position of these shapes to generate real-time techno music loops.

## Key Features Implemented

- **Visual Sequencer:** Draw shapes (Freehand, Line, Circle, Squiggle) to create musical loops.
- **Synesthetic Audio Engine:**
  - **Y-Axis:** Controls Pitch.
  - **X-Axis:** Controls Timing/Duration.
  - **Red Color Channel:** Controls Distortion amount.
  - **Blue Color Channel:** Controls Filter depth/Timbre.
- **Real-Time Visualizer:** A mirrored frequency analyzer that reacts to the master audio output.
- **Cross-Platform:** Built with Electron to run natively on Windows/macOS.
- **Smart Garbage Collection:** Custom logic to prevent "ghost notes" and manage audio memory efficiently.

## Technical Approach & Design Choices

- **React.js:** Used for the UI layer and state management.
- **Native Web Audio API:** Instead of using Tone.js I wanted to learn more about how audio nodes connect. I relied heavily on MDN documentation, tutorials, and AI assistance to figure out how to manually map the RGB color values to audio effects.
- **Canvas API:** Used for both the drawing interface and the high-performance visualizer (60fps).
- **Performance Optimization:** The audio engine runs outside the React render cycle using `useRef` and `requestAnimationFrame`. This decouples the audio timing from the UI, preventing lag and glitches.

## Steps to Run Locally

**Prerequisites:** Node.js installed.

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd synesthesia-composer
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Run in Development Mode:**
    ```bash
    npm start         # Starts React Server
    npm run electron  # Starts Electron Window
    ```
4.  **Build for Production (Windows/Mac):**
    ```bash
    npm run build-electron
    ```
    _The executable will be found in the `dist/` folder._

## Dependencies

- **React / React-DOM:** Frontend framework.
- **Electron:** Cross-platform desktop wrapper.
- **Electron-Builder:** Tool for packaging the final executable.

## Note on NPM Audit:

This project uses react-scripts (Create React App), which has known dev-dependency vulnerabilities in nth-check and postcss. These are build-time tools and do not affect the security or functionality of the compiled Electron application.
