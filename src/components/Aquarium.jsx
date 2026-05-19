function Aquarium({ aquariumRef, fishes, debugBounds, showDebugMenu, backgroundLottie, fishLottie, FishComponent, dc }) {
  const [bounds, setBounds] = dc.useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    right: 0,
    bottom: 0,
  });
  const [isLottiePlayerReady, setIsLottiePlayerReady] = dc.useState(false);
  const [localBounds, setLocalBounds] = dc.useState({
    topPercent: debugBounds.topPercent || 30,
    heightPercent: debugBounds.heightPercent || 30,
    leftPercent: 18,
    rightPercent: 18,
  });

  // Draggable debug panel state
  const [debugPosition, setDebugPosition] = dc.useState({ x: 20, y: 60 });
  const [isDragging, setIsDragging] = dc.useState(false);
  const [dragOffset, setDragOffset] = dc.useState({ x: 0, y: 0 });
  const debugPanelRef = dc.useRef(null);

  // Wait for lottie-player to be ready
  dc.useEffect(() => {
    const checkLottiePlayer = () => {
      if (window.customElements.get("lottie-player")) {
        setIsLottiePlayerReady(true);
      } else {
        setTimeout(checkLottiePlayer, 100);
      }
    };
    checkLottiePlayer();
  }, []);

  // Drag handlers for debug panel
  dc.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setDebugPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Calculate bounds on mount and resize - Optimized with debouncing and responsive formula
  dc.useEffect(() => {
    if (!aquariumRef) return;

    let debounceTimer = null;

    const calculateBounds = () => {
      const containerRect = aquariumRef.getBoundingClientRect();

      // The aquarium.json is 1080x1080 (square)
      // With objectFit: "cover", it scales to cover the container
      const LOTTIE_NATIVE_WIDTH = 1080;
      const LOTTIE_NATIVE_HEIGHT = 1080;
      const LOTTIE_ASPECT_RATIO = LOTTIE_NATIVE_WIDTH / LOTTIE_NATIVE_HEIGHT; // 1:1

      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const containerAspectRatio = containerWidth / containerHeight;

      // Calculate actual rendered lottie dimensions with objectFit: "cover"
      let lottieRenderedWidth, lottieRenderedHeight;
      let lottieOffsetX = 0, lottieOffsetY = 0;

      if (containerAspectRatio > LOTTIE_ASPECT_RATIO) {
        // Container is wider than lottie - lottie width matches container, height is cropped
        lottieRenderedWidth = containerWidth;
        lottieRenderedHeight = containerWidth / LOTTIE_ASPECT_RATIO;
        lottieOffsetY = (containerHeight - lottieRenderedHeight) / 2;
      } else {
        // Container is taller than lottie - lottie height matches container, width is cropped
        lottieRenderedHeight = containerHeight;
        lottieRenderedWidth = containerHeight * LOTTIE_ASPECT_RATIO;
        lottieOffsetX = (containerWidth - lottieRenderedWidth) / 2;
      }

      // Calculate what portion of the lottie is actually visible in the container
      const visibleLottieWidth = Math.min(lottieRenderedWidth, containerWidth);
      const visibleLottieHeight = Math.min(lottieRenderedHeight, containerHeight);

      // Calculate the visible portion's offset within the rendered lottie
      const cropOffsetX = lottieOffsetX < 0 ? Math.abs(lottieOffsetX) : 0;
      const cropOffsetY = lottieOffsetY < 0 ? Math.abs(lottieOffsetY) : 0;

      // All bounds are now relative to the VISIBLE portion of the lottie
      let topPercent, heightPercent, leftPercent, rightPercent;
      if (showDebugMenu) {
        topPercent = localBounds.topPercent;
        heightPercent = localBounds.heightPercent;
        leftPercent = localBounds.leftPercent;
        rightPercent = localBounds.rightPercent;
      } else {
        topPercent = 30;
        heightPercent = 30;
        leftPercent = 18;
        rightPercent = 18;
      }

      // Calculate pixel values based on VISIBLE lottie portion
      const topOffset = (visibleLottieHeight * topPercent) / 100;
      const swimHeight = (visibleLottieHeight * heightPercent) / 100;
      const leftPadding = (visibleLottieWidth * leftPercent) / 100;
      const rightPadding = (visibleLottieWidth * rightPercent) / 100;

      const newBounds = {
        left: Math.max(0, lottieOffsetX) + leftPadding,
        top: Math.max(0, lottieOffsetY) + topOffset,
        width: visibleLottieWidth - leftPadding - rightPadding,
        height: swimHeight,
        right: Math.max(0, lottieOffsetX) + visibleLottieWidth - rightPadding,
        bottom: Math.max(0, lottieOffsetY) + topOffset + swimHeight,
      };

      setBounds(newBounds);

      if (showDebugMenu) {
        console.log("Bounds calculated from VISIBLE lottie portion:", {
          containerDims: `${Math.round(containerWidth)}x${Math.round(containerHeight)}`,
          lottieRenderedDims: `${Math.round(lottieRenderedWidth)}x${Math.round(lottieRenderedHeight)}`,
          visibleLottieDims: `${Math.round(visibleLottieWidth)}x${Math.round(visibleLottieHeight)}`,
          lottieOffset: `X:${Math.round(lottieOffsetX)}, Y:${Math.round(lottieOffsetY)}`,
          cropOffset: `X:${Math.round(cropOffsetX)}, Y:${Math.round(cropOffsetY)}`,
          bounds: newBounds
        });
      }
    };

    const debouncedCalculate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(calculateBounds, 50);
    };

    // Initial calculation with delay for DOM to be ready
    const timer = setTimeout(calculateBounds, 100);

    // Use ResizeObserver for better resize detection
    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(debouncedCalculate);
      resizeObserver.observe(aquariumRef);
    }

    window.addEventListener('resize', debouncedCalculate);

    return () => {
      clearTimeout(timer);
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('resize', debouncedCalculate);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [aquariumRef, localBounds, showDebugMenu]);

  if (!isLottiePlayerReady) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "rgba(0, 170, 187, 0.8)",
        fontFamily: "monospace",
        fontSize: "14px",
        gap: "8px",
      }}>
        <dc.Icon icon="loader-2" style={{ animation: "spin 1s linear infinite" }} />
        <span>Loading aquarium...</span>
      </div>
    );
  }

  return (
    <>
      {/* Background Lottie */}
      {backgroundLottie && (
        <lottie-player
          src={backgroundLottie}
          background="transparent"
          speed="1"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: "0",
            left: "0",
            zIndex: "1",
            objectFit: "cover",
            pointerEvents: "none",
          }}
          loop
          autoplay
          renderer="svg"
        />
      )}

      {/* Debug controls */}
      {showDebugMenu && (
        <div
          ref={debugPanelRef}
          style={{
            position: "absolute",
            top: `${debugPosition.y}px`,
            left: `${debugPosition.x}px`,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(10px)",
            color: "white",
            padding: "16px",
            borderRadius: "8px",
            fontFamily: "var(--font-interface)",
            fontSize: "12px",
            zIndex: "1000",
            minWidth: "350px",
            maxWidth: "400px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            cursor: isDragging ? "grabbing" : "default",
          }}
        >
          <div
            style={{
              marginBottom: "12px",
              fontWeight: "bold",
              fontSize: "14px",
              color: "#00aabb",
              cursor: "grab",
              userSelect: "none",
              padding: "4px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onMouseDown={(e) => {
              if (!debugPanelRef.current) return;
              const rect = debugPanelRef.current.getBoundingClientRect();
              setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
              setIsDragging(true);
            }}
          >
            <div>
              <dc.Icon icon="bug" style={{ fontSize: "16px", marginRight: "6px", verticalAlign: "middle" }} />
              <span style={{ verticalAlign: "middle" }}>Bounds Debug</span>
            </div>
            <dc.Icon icon="move" style={{ fontSize: "14px", opacity: 0.5 }} />
          </div>

          <div style={{ marginBottom: "12px", padding: "8px", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "4px" }}>
            <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
              Container: {aquariumRef ? Math.round(aquariumRef.getBoundingClientRect().width) : 0}px × {aquariumRef ? Math.round(aquariumRef.getBoundingClientRect().height) : 0}px
            </div>
            <div style={{ fontSize: "11px", color: "#4fc3f7", marginBottom: "4px" }}>
              Lottie Visible (1080x1080 native): {aquariumRef ? (() => {
                const rect = aquariumRef.getBoundingClientRect();
                const aspectRatio = rect.width / rect.height;
                let renderedWidth, renderedHeight;

                if (aspectRatio > 1) {
                  renderedWidth = rect.width;
                  renderedHeight = rect.width;
                } else {
                  renderedHeight = rect.height;
                  renderedWidth = rect.height;
                }

                const visibleWidth = Math.min(renderedWidth, rect.width);
                const visibleHeight = Math.min(renderedHeight, rect.height);

                return `${Math.round(visibleWidth)}px × ${Math.round(visibleHeight)}px`;
              })() : 'N/A'}
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Bounds: {Math.round(bounds.width)}px × {Math.round(bounds.height)}px</div>
          </div>

          <div style={{
            marginBottom: "12px",
            padding: "8px",
            backgroundColor: "rgba(0, 170, 187, 0.15)",
            borderRadius: "4px",
            border: "1px solid rgba(0, 170, 187, 0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <dc.Icon icon="info" style={{ fontSize: "14px", color: "#00aabb" }} />
              <span style={{ fontSize: "11px", color: "#00aabb", fontWeight: "500" }}>
                % values are relative to VISIBLE aquarium portion (1080x1080 with objectFit: cover).
              </span>
            </div>
          </div>

          <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid rgba(255,255,255,0.15)" }} />

          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontWeight: "500" }}>Top (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={localBounds.topPercent}
                onChange={(e) => setLocalBounds({...localBounds, topPercent: parseFloat(e.target.value) || 0})}
                style={{
                  width: "70px",
                  padding: "4px 8px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "4px",
                  color: "white",
                  fontSize: "12px",
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={localBounds.topPercent}
              onChange={(e) => setLocalBounds({...localBounds, topPercent: parseFloat(e.target.value)})}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontWeight: "500" }}>Height (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={localBounds.heightPercent}
                onChange={(e) => setLocalBounds({...localBounds, heightPercent: parseFloat(e.target.value) || 0})}
                style={{
                  width: "70px",
                  padding: "4px 8px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "4px",
                  color: "white",
                  fontSize: "12px",
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={localBounds.heightPercent}
              onChange={(e) => setLocalBounds({...localBounds, heightPercent: parseFloat(e.target.value)})}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontWeight: "500" }}>Left (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={localBounds.leftPercent}
                onChange={(e) => setLocalBounds({...localBounds, leftPercent: parseFloat(e.target.value) || 0})}
                style={{
                  width: "70px",
                  padding: "4px 8px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "4px",
                  color: "white",
                  fontSize: "12px",
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.1"
              value={localBounds.leftPercent}
              onChange={(e) => setLocalBounds({...localBounds, leftPercent: parseFloat(e.target.value)})}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontWeight: "500" }}>Right (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={localBounds.rightPercent}
                onChange={(e) => setLocalBounds({...localBounds, rightPercent: parseFloat(e.target.value) || 0})}
                style={{
                  width: "70px",
                  padding: "4px 8px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "4px",
                  color: "white",
                  fontSize: "12px",
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.1"
              value={localBounds.rightPercent}
              onChange={(e) => setLocalBounds({...localBounds, rightPercent: parseFloat(e.target.value)})}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              onClick={() => {
                const containerRect = aquariumRef ? aquariumRef.getBoundingClientRect() : { width: 0, height: 0 };
                const LOTTIE_ASPECT_RATIO = 1;
                const containerAspectRatio = containerRect.width / containerRect.height;
                let lottieRenderedWidth, lottieRenderedHeight;

                if (containerAspectRatio > LOTTIE_ASPECT_RATIO) {
                  lottieRenderedWidth = containerRect.width;
                  lottieRenderedHeight = containerRect.width;
                } else {
                  lottieRenderedHeight = containerRect.height;
                  lottieRenderedWidth = containerRect.height;
                }

                const visibleWidth = Math.min(lottieRenderedWidth, containerRect.width);
                const visibleHeight = Math.min(lottieRenderedHeight, containerRect.height);

                const configText = `// Container: ${Math.round(containerRect.width)}px × ${Math.round(containerRect.height)}px
// Lottie Visible (1080x1080 native): ${Math.round(visibleWidth)}px × ${Math.round(visibleHeight)}px
// All % values are relative to VISIBLE lottie portion (objectFit: cover)
{
  "containerWidth": ${Math.round(containerRect.width)},
  "containerHeight": ${Math.round(containerRect.height)},
  "lottieVisibleWidth": ${Math.round(visibleWidth)},
  "lottieVisibleHeight": ${Math.round(visibleHeight)},
  "topPercent": ${localBounds.topPercent},
  "heightPercent": ${localBounds.heightPercent},
  "leftPercent": ${localBounds.leftPercent},
  "rightPercent": ${localBounds.rightPercent}
}`;

                navigator.clipboard.writeText(configText).then(() => {
                  console.log("Copied to clipboard:", configText);
                  new Notice("Bounds config copied!");
                }).catch(err => {
                  console.error("Failed to copy:", err);
                  console.log(configText);
                  new Notice("Check console for config");
                });
              }}
              style={{
                flex: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px",
                backgroundColor: "rgba(40, 167, 69, 0.8)",
                border: "none",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(40, 167, 69, 1)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(40, 167, 69, 0.8)"}
            >
              <dc.Icon icon="copy" style={{ fontSize: "14px" }} />
              <span>Copy Config</span>
            </button>
          </div>
        </div>
      )}

      {/* Debug bounds rectangle */}
      {bounds.width > 0 && showDebugMenu && (
        <div style={{
          position: "absolute",
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          border: "3px solid rgba(255, 0, 0, 0.8)",
          backgroundColor: "rgba(255, 0, 0, 0.1)",
          pointerEvents: "none",
          zIndex: "999",
          boxSizing: "border-box",
        }}>
          <div style={{
            position: "absolute",
            top: "-25px",
            left: "0",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "4px 8px",
            fontSize: "12px",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            borderRadius: "4px",
          }}>
            {`W: ${Math.round(bounds.width)}px | H: ${Math.round(bounds.height)}px`}
          </div>
        </div>
      )}

      {/* Render fish - Memoized to prevent unnecessary re-renders */}
      {bounds.width > 0 && fishLottie && fishes.map((fish, index) => {
        const fishKey = `fish-${fish.name}-${index}`;
        return (
          <FishComponent
            key={fishKey}
            name={fish.name}
            bounds={bounds}
            fishLottie={fishLottie}
            dc={dc}
          />
        );
      })}
    </>
  );
}

return { Aquarium };
