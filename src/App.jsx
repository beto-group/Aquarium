// DOM Traversal Utilities for full-tab mode
function findNearestAncestorWithClass(element, className) {
  if (!element) return null;
  let current = element.parentNode;
  while (current) {
    if (current.classList && current.classList.contains(className)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function findDirectChildByClass(parent, className) {
  if (!parent) return null;
  for (const child of parent.children) {
    if (child.classList && child.classList.contains(className)) {
      return child;
    }
  }
  return null;
}

function View({ fishes = [
  { name: 'Brush Teeth' },
  { name: 'Read' },
  { name: 'Exercise' },
  { name: 'Journal' },
  { name: 'Code' },
  { name: 'Vitamins' },
], folderPath }) {
  const aquariumRef = dc.useRef();
  const containerRef = dc.useRef(null);
  const [isRefReady, setIsRefReady] = dc.useState(false);
  
  // Script and components state
  const [loadScript, setLoadScript] = dc.useState(null);
  const [backgroundLottieSrc, setBackgroundLottieSrc] = dc.useState(null);
  const [fishLottieSrc, setFishLottieSrc] = dc.useState(null);
  
  const [AquariumComponent, setAquariumComponent] = dc.useState(null);
  const [FishComponent, setFishComponent] = dc.useState(null);

  // Full-tab mode state
  const [isFullTab, setIsFullTab] = dc.useState(true);
  const stateRefs = dc.useRef({}).current;

  // Bounds configuration
  const debugBounds = {
    topPercent: 36,
    heightPercent: 26,
    leftPadding: 53,
    rightPadding: 64,
  };

  // Load utilities and components dynamically
  dc.useEffect(() => {
    let active = true;

    async function loadResources() {
      try {
        const { loadScript: loadedScript } = await dc.require(folderPath + "/src/utils/loadScript.js");
        if (!active) return;
        setLoadScript(() => loadedScript);

        const { Aquarium: loadedAquarium } = await dc.require(folderPath + "/src/components/Aquarium.jsx");
        if (!active) return;
        setAquariumComponent(() => loadedAquarium);

        const { FishComponent: loadedFish } = await dc.require(folderPath + "/src/components/FishComponent.jsx");
        if (!active) return;
        setFishComponent(() => loadedFish);
      } catch (err) {
        console.error("Failed to load Aquarium subcomponents:", err);
      }
    }

    loadResources();
    return () => {
      active = false;
    };
  }, [folderPath]);

  // Check when ref is ready
  dc.useEffect(() => {
    if (aquariumRef.current) {
      setIsRefReady(true);
    }
  }, [aquariumRef.current]);

  // Load lottie-player script
  dc.useEffect(() => {
    if (loadScript && !window.customElements.get("lottie-player")) {
      loadScript(dc, "https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js")
        .catch(err => console.error("Failed to load lottie-player:", err));
    }
  }, [loadScript]);

  // Load Lottie media files via fuzzy find
  dc.useEffect(() => {
    if (!loadScript) return;

    async function fuzzyFindFile(filename) {
      if (!window.Fuse) {
        await loadScript(dc, "https://cdn.jsdelivr.net/npm/fuse.js/dist/fuse.js");
      }
      const fuse = new Fuse(app.vault.getFiles(), {
        keys: ["name"],
        includeScore: true,
        threshold: 0.4,
      });
      const results = fuse.search(filename);
      return results.length > 0 ? results[0].item : null;
    }

    async function requireMediaFile(filename) {
      const file = await fuzzyFindFile(filename);
      if (!file) throw new Error(`File "${filename}" not found`);
      return app.vault.getResourcePath(file);
    }

    requireMediaFile('aquarium.json')
      .then(url => setTimeout(() => setBackgroundLottieSrc(url), 0))
      .catch(err => console.error('Failed to load aquarium.json:', err));

    requireMediaFile('fish.json')
      .then(url => setTimeout(() => setFishLottieSrc(url), 0))
      .catch(err => console.error('Failed to load fish.json:', err));
  }, [loadScript]);

  // Full-tab DOM manipulation with status bar / footer suppression
  dc.useEffect(() => {
    const container = containerRef.current;
    if (!container || !isFullTab) return;

    const targetPaneContent = findNearestAncestorWithClass(container, "workspace-leaf-content");
    if (!targetPaneContent) return;

    const contentWrapper = findDirectChildByClass(targetPaneContent, "view-content") || targetPaneContent;

    stateRefs.originalParent = container.parentNode;
    stateRefs.placeholder = document.createElement("div");
    stateRefs.placeholder.style.display = "none";
    container.parentNode.insertBefore(stateRefs.placeholder, container);

    // Inject status bar suppression stylesheet
    const styleId = `impeccable-status-aquarium`;
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = `
        /* Hide global status bar and view footers */
        .status-bar, .view-footer, .workspace-leaf-content-footer { 
            display: none !important; 
        }
        
        /* Expand workspace-leaf-content to edge-to-edge container */
        .workspace-leaf-content { 
            padding: 0 !important; 
            margin: 0 !important; 
            border-radius: 0 !important; 
        }
      `;
      document.head.appendChild(styleEl);
    }

    stateRefs.parentPositionInfo = {
      element: contentWrapper,
      original: window.getComputedStyle(contentWrapper).position,
    };
    if (stateRefs.parentPositionInfo.original === "static") {
      contentWrapper.style.position = "relative";
    }

    contentWrapper.appendChild(container);
    Object.assign(container.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "9998",
      backgroundColor: "var(--background-primary)",
      overflow: "auto",
    });

    return () => {
      if (stateRefs.placeholder?.parentNode) {
        stateRefs.placeholder.parentNode.replaceChild(container, stateRefs.placeholder);
      }
      const el = document.getElementById(styleId);
      if (el) el.remove();
      if (stateRefs.parentPositionInfo?.element) {
        stateRefs.parentPositionInfo.element.style.position =
          stateRefs.parentPositionInfo.original === "static" ? "" : stateRefs.parentPositionInfo.original;
      }
      container.removeAttribute("style");
      Object.keys(stateRefs).forEach((key) => (stateRefs[key] = null));
    };
  }, [isFullTab]);

  // Compact mode view
  if (!isFullTab) {
    return (
      <div ref={containerRef} style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        border: "1px dashed var(--background-modifier-border)",
        borderRadius: "8px",
        backgroundColor: "var(--background-primary-alt)",
      }}>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px", fontFamily: "monospace" }}>
          Aquarium in compact mode
        </p>
        <button
          onClick={() => setIsFullTab(true)}
          style={{
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: "500",
            color: "var(--text-on-accent)",
            backgroundColor: "var(--interactive-accent)",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          Enter Full Tab
        </button>
      </div>
    );
  }

  const [showDebugMenu, setShowDebugMenu] = dc.useState(false);

  return (
    <div ref={containerRef} style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--background-primary)",
      overflow: "hidden",
    }}>
      {/* Top control buttons */}
      <div style={{
        position: "absolute",
        top: "15px",
        right: "20px",
        display: "flex",
        gap: "10px",
        zIndex: "1000",
      }}>
        {/* Debug button */}
        <button
          onClick={() => setShowDebugMenu(!showDebugMenu)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            fontSize: "13px",
            fontWeight: "500",
            color: showDebugMenu ? "var(--text-on-accent)" : "var(--text-faint)",
            backgroundColor: showDebugMenu ? "var(--interactive-accent)" : "rgba(0, 0, 0, 0.5)",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontFamily: "monospace",
          }}
          onMouseEnter={(e) => {
            if (!showDebugMenu) {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
              e.currentTarget.style.color = "var(--text-normal)";
            }
          }}
          onMouseLeave={(e) => {
            if (!showDebugMenu) {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
              e.currentTarget.style.color = "var(--text-faint)";
            }
          }}
        >
          <dc.Icon icon="bug" style={{ fontSize: "16px" }} />
          <span>Debug</span>
        </button>

        {/* Exit full-tab button */}
        <button
          onClick={() => setIsFullTab(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            fontSize: "13px",
            fontWeight: "500",
            color: "var(--text-faint)",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontFamily: "monospace",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            e.currentTarget.style.color = "var(--text-normal)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
            e.currentTarget.style.color = "var(--text-faint)";
          }}
        >
          <dc.Icon icon="minimize-2" style={{ fontSize: "16px" }} />
          <span>Exit Full Tab</span>
        </button>
      </div>
      
      <div className="tank" ref={aquariumRef} style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}>
        {isRefReady && AquariumComponent && FishComponent && backgroundLottieSrc && fishLottieSrc ? (
          <AquariumComponent
            aquariumRef={aquariumRef.current}
            fishes={fishes}
            debugBounds={debugBounds}
            showDebugMenu={showDebugMenu}
            backgroundLottie={backgroundLottieSrc}
            fishLottie={fishLottieSrc}
            FishComponent={FishComponent}
            dc={dc}
          />
        ) : (
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
            <span>Initializing aquarium...</span>
          </div>
        )}
      </div>
    </div>
  );
}

return { View };
