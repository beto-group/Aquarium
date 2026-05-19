# Contribution Guidelines

Thank you for contributing to Aquarium! Please follow these engineering standards when submitting changes:

## Code Conventions

*   **No Emojis**: Emojis are strictly prohibited in code comments, React components, and documentation.
*   **Separation of Concerns**: Keep components modularized under the `src/components` directory. Utility modules belong in `src/utils`.
*   **Dynamic Loading**: External scripts (Fuse.js, Lottie-player) must be loaded dynamically using the cached script loader utility (`src/utils/loadScript.js`).

## Performance Standards

*   **Frame Capping**: Keep animation rates restricted to 60 FPS using relative performance timers to avoid excessive processing on lower-end machines.
*   **GPU Acceleration**: Use 3D transforms (`translate3d`) and `will-change` CSS hints to ensure smooth fish swimming animations.
*   **Clean Up Loops**: Always clear animation frame loops, observers, and event listeners upon unmounting components.
