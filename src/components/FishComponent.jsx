function FishComponent({ name, bounds, fishLottie, dc }) {
  const [position, setPosition] = dc.useState({ x: 0, y: 0 });
  const [direction, setDirection] = dc.useState(1); // 1 = right, -1 = left
  const [isInitialized, setIsInitialized] = dc.useState(false);
  const [isHovered, setIsHovered] = dc.useState(false);
  const [isEnlarged, setIsEnlarged] = dc.useState(false);
  const [isPinned, setIsPinned] = dc.useState(false);
  const [showName, setShowName] = dc.useState(false);

  // Use refs for animation state to avoid re-renders
  const animationStateRef = dc.useRef({
    verticalDirection: (Math.random() - 0.5) * 2,
    frameCount: 0,
    lastHorizontalTurn: 0,
    lastVerticalChange: 0,
    horizontalCooldown: Math.random() * 180 + 120,
    verticalCooldown: Math.random() * 120 + 60,
  });

  const BASE_FISH_WIDTH = 120;
  const BASE_FISH_HEIGHT = 90;
  const ENLARGED_MULTIPLIER = 1.3;

  const FISH_WIDTH = isEnlarged ? BASE_FISH_WIDTH * ENLARGED_MULTIPLIER : BASE_FISH_WIDTH;
  const FISH_HEIGHT = isEnlarged ? BASE_FISH_HEIGHT * ENLARGED_MULTIPLIER : BASE_FISH_HEIGHT;
  const SPEED = 1.1;
  const VERTICAL_SPEED = 0.6;

  // Initialize fish position and handle bounds changes
  dc.useEffect(() => {
    if (!bounds || bounds.width === 0 || bounds.height === 0) return;

    if (!isInitialized) {
      // Initial spawn
      const spawnX = bounds.left + Math.random() * (bounds.width - FISH_WIDTH);
      const spawnY = bounds.top + Math.random() * (bounds.height - FISH_HEIGHT);
      setPosition({ x: spawnX, y: spawnY });
      setIsInitialized(true);
    } else {
      // Bounds changed (resize), clamp position to new bounds
      setPosition(prev => {
        const clampedX = Math.max(bounds.left, Math.min(prev.x, bounds.left + bounds.width - FISH_WIDTH));
        const clampedY = Math.max(bounds.top, Math.min(prev.y, bounds.top + bounds.height - FISH_HEIGHT));
        return { x: clampedX, y: clampedY };
      });
    }
  }, [bounds, isInitialized, FISH_WIDTH, FISH_HEIGHT]);

  // Animation loop - Optimized to reduce state updates
  dc.useEffect(() => {
    if (!isInitialized || !bounds || bounds.width === 0) return;

    let animationId = null;
    let lastTime = performance.now();
    let isRunning = true;
    const state = animationStateRef.current;

    const FPS = 60;
    const FRAME_INTERVAL = 1000 / FPS;

    const animate = (currentTime) => {
      if (!isRunning) return;

      // Pause animation when hovered
      if (isHovered) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - lastTime;

      if (elapsed > FRAME_INTERVAL) {
        lastTime = currentTime - (elapsed % FRAME_INTERVAL);
        state.frameCount++;

        setPosition(prev => {
          let newX = prev.x + (SPEED * direction);
          let newDirection = direction;

          // Check horizontal bounds
          const leftEdge = bounds.left;
          const rightEdge = bounds.left + bounds.width - FISH_WIDTH;

          if (newX >= rightEdge) {
            newX = rightEdge;
            newDirection = -1;
            setDirection(-1);
            state.lastHorizontalTurn = state.frameCount;
            state.horizontalCooldown = Math.random() * 180 + 120;
          } else if (newX <= leftEdge) {
            newX = leftEdge;
            newDirection = 1;
            setDirection(1);
            state.lastHorizontalTurn = state.frameCount;
            state.horizontalCooldown = Math.random() * 180 + 120;
          } else {
            // Random chance to turn around only if cooldown has passed
            const framesSinceLastTurn = state.frameCount - state.lastHorizontalTurn;
            if (framesSinceLastTurn > state.horizontalCooldown && Math.random() < 0.008) {
              newDirection = -newDirection;
              setDirection(newDirection);
              state.lastHorizontalTurn = state.frameCount;
              state.horizontalCooldown = Math.random() * 180 + 120;
            }
          }

          // Vertical movement with smooth direction changes
          let newY = prev.y + (VERTICAL_SPEED * state.verticalDirection);

          const topEdge = bounds.top;
          const bottomEdge = bounds.top + bounds.height - FISH_HEIGHT;

          // Bounce off vertical edges
          if (newY >= bottomEdge) {
            newY = bottomEdge;
            state.verticalDirection = -Math.abs(state.verticalDirection);
            state.lastVerticalChange = state.frameCount;
            state.verticalCooldown = Math.random() * 120 + 60;
          } else if (newY <= topEdge) {
            newY = topEdge;
            state.verticalDirection = Math.abs(state.verticalDirection);
            state.lastVerticalChange = state.frameCount;
            state.verticalCooldown = Math.random() * 120 + 60;
          } else {
            // Random chance to change vertical direction only if cooldown has passed
            const framesSinceLastChange = state.frameCount - state.lastVerticalChange;
            if (framesSinceLastChange > state.verticalCooldown && Math.random() < 0.005) {
              state.verticalDirection = (Math.random() - 0.5) * 2;
              state.lastVerticalChange = state.frameCount;
              state.verticalCooldown = Math.random() * 120 + 60;
            }
          }

          return { x: newX, y: newY };
        });
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };
  }, [isInitialized, bounds, direction, isHovered, FISH_WIDTH, FISH_HEIGHT, SPEED, VERTICAL_SPEED]);

  if (!isInitialized) return null;

  const handleClick = () => {
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    setIsEnlarged(newPinnedState);
    setShowName(newPinnedState);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: "0",
        top: "0",
        width: `${FISH_WIDTH}px`,
        height: `${FISH_HEIGHT}px`,
        transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${isEnlarged ? 1.3 : 1})`,
        transition: "transform 0.3s ease",
        zIndex: isHovered || isEnlarged ? "200" : "100",
        pointerEvents: "all",
        cursor: "pointer",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
      onClick={handleClick}
      onMouseEnter={() => {
        setIsHovered(true);
        if (!isPinned) setShowName(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isPinned) setShowName(false);
      }}
    >
      <lottie-player
        src={fishLottie}
        background="transparent"
        speed="1"
        style={{
          width: "100%",
          height: "100%",
          transform: `scaleX(${direction})`,
          transition: "transform 0.15s linear",
          filter: isHovered ? "drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))" : "none",
          willChange: "transform",
        }}
        loop
        autoplay
      />

      {/* Fish name label */}
      {showName && (
        <div style={{
          position: "absolute",
          top: "-40px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(0, 170, 187, 0.95)",
          color: "white",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: "600",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          zIndex: "300",
          animation: "fadeIn 0.2s ease",
        }}>
          {name}
        </div>
      )}
    </div>
  );
}

return { FishComponent };
