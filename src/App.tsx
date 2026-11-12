"use client";
import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Layer, UploadedHistory, ContextMenuState } from './types';
import { 
  Settings, 
  Download, 
  Copy, 
  Check, 
  Upload, 
  ExternalLink,
  Info,
  Trash2,
  Smile,
  Layers,
  Megaphone,
  Minimize2,
  Plus,
  Minus,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Move,
  Sun,
  Moon,
  Scissors,
  Undo2,
  Redo2,
  FlipHorizontal,
  FlipVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import JSZip from 'jszip';
import { StudioSelect, StudioSlider, StudioColorPicker } from './components/StudioControls';
import { 
  EMOJI_STYLES, 
  GRADIENTS, 
  POPULAR_EMOJIS, 
  getEmojiUrl, 
  parseEmojis, 
  uploadToImgBB, 
  uploadToImgur,
  getGemojiList
} from './utils/emoji';

// Pre-flatten popular emojis once at module scope to avoid reallocation per render
const ALL_POPULAR_EMOJIS = Object.values(POPULAR_EMOJIS).flat();

// Pre-index gemoji shortcodes into an O(1) map for instantaneous lookup
const SHORTCODE_MAP = new Map<string, string>();
for (const item of getGemojiList()) {
  for (const name of item.names) {
    SHORTCODE_MAP.set(name.toLowerCase(), item.emoji);
    SHORTCODE_MAP.set(name.toLowerCase().replace(/_/g, '-'), item.emoji);
  }
}

// 2D Matrix Helpers for auxiliary transform calculations
const _m3 = {
  projection: (width: number, height: number) => [
    2 / width, 0, 0,
    0, -2 / height, 0,
    -1, 1, 1
  ],
  identity: () => [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ],
  translation: (tx: number, ty: number) => [
    1, 0, 0,
    0, 1, 0,
    tx, ty, 1
  ],
  rotation: (angleInRadians: number) => {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [
      c, s, 0,
      -s, c, 0,
      0, 0, 1
    ];
  },
  scaling: (sx: number, sy: number) => [
    sx, 0, 0,
    0, sy, 0,
    0, 0, 1
  ],
  skewing: (kx: number, ky: number) => [
    1, Math.tan(ky), 0,
    Math.tan(kx), 1, 0,
    0, 0, 1
  ]
};

export default function App() {
  const [, startTransition] = useTransition();

  // Theme state
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smolji_theme') || 'dark';
    }
    return 'dark';
  });

  // Input states
  const [inputText, setInputText] = useState('🚀');
  const [detectedEmojis, setDetectedEmojis] = useState<string[]>(['🚀']);
  const [selectedStyle, setSelectedStyle] = useState('microsoft-3D-fluent');

  // Autocomplete states
  interface SuggestionItem {
    emoji: string;
    names: string[];
    tags: string[];
    description: string;
  }
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [caretInfo, setCaretInfo] = useState<{ query: string; startIndex: number; endIndex: number } | null>(null);

  // Multi-layer composition states
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: 'base',
      emoji: '🚀',
      style: 'microsoft-3D-fluent',
      x: 0,
      y: 0,
      scale: 1.0,
      rotation: 0,
      skewX: 0,
      skewY: 0,
      opacity: 1.0
    }
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('base');

  // History stacks for Undo / Redo
  const [undoStack, setUndoStack] = useState<Layer[][]>([]);
  const [redoStack, setRedoStack] = useState<Layer[][]>([]);

  // Canvas Viewport states (Zoom & Pan)
  const [canvasZoom, setCanvasZoom] = useState(0.85); 
  const [panX, setPanX] = useState(0); 
  const [panY, setPanY] = useState(0); 
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, layerId: null });

  // Clipboard state for layers
  const [copiedLayerData, setCopiedLayerData] = useState<Layer | null>(null);

  // Viewport and UI Panels States
  const [viewportSize, setViewportSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  });
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const [bgType, setBgType] = useState<string>('gradient'); // 'transparent', 'solid', 'gradient'
  const [solidBg, setSolidBg] = useState('#12131a');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[1]); 
  const [borderRadius, setBorderRadius] = useState(25); 
  const [exportSize, setExportSize] = useState(512); 
  
  // Shadow states
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowColor, setShadowColor] = useState('rgba(0, 0, 0, 0.45)');
  const [shadowBlur, setShadowBlur] = useState(15);
  const [shadowOffsetX, _setShadowOffsetX] = useState(0);
  const [shadowOffsetY, _setShadowOffsetY] = useState(8);

  // Settings & Upload states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState({ imgbb: '', imgur: '' });
  const [showImgbbKey, setShowImgbbKey] = useState(false);
  const [showImgurId, setShowImgurId] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadedHistory[]>([]);
  const [isUploading, setIsUploading] = useState<string | null>('');
  const [uploadResultUrl, setUploadResultUrl] = useState('');
  
  // UI Status states
  const [successMessage, setSuccessMessage] = useState<string | null>('');
  const [isZipping, setIsZipping] = useState(false);
  const [, setCanvasError] = useState('');

  // Interactive interactionMode: null | 'drag' | 'rotate' | 'scale_tl' | 'scale_tr' | 'scale_bl' | 'scale_br'
  const [interactionMode, setInteractionMode] = useState<string | null>(null);

  // Refs for tracking drag coordinates and high performance rendering
  const dragStart = useRef({ mouseX: 0, mouseY: 0, layerX: 0, layerY: 0, layerScale: 1.0, layerRotation: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const touchStartDist = useRef(0);
  const touchStartZoom = useRef(1);
  const touchStartLayerScale = useRef(1);
  const imageCache = useRef<Record<string, HTMLImageElement | 'loading' | 'failed'>>({}); 
  const redrawPending = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const pushStateToUndo = (currentLayers: Layer[]) => {
    setUndoStack(prev => [...prev.slice(-25), currentLayers]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, layers]);
    setLayers(previous);
    if (!previous.some(l => l.id === selectedLayerId)) {
      setSelectedLayerId(previous[previous.length - 1]?.id || null);
    }
    showToast('Undo');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, layers]);
    setLayers(next);
    if (!next.some(l => l.id === selectedLayerId)) {
      setSelectedLayerId(next[next.length - 1]?.id || null);
    }
    showToast('Redo');
  };

  // Sync Tailwind class on root html node
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    try {
      localStorage.setItem('smolji_theme', theme);
    } catch {
      // storage unavailable
    }
  }, [theme]);

  // Global listeners for spacebar pan trigger
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (e.code === 'Space' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);

  // Global Context Menu hiding click listener
  useEffect(() => {
    const closeMenu = () => setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Load localStorage on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('emoji_studio_keys');
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (e) {
        console.error('Error parsing saved API keys', e);
      }
    }

    const savedHistory = localStorage.getItem('emoji_studio_history');
    if (savedHistory) {
      try {
        setUploadHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error parsing saved upload history', e);
      }
    }
  }, []);

  // Update detected emojis when text changes
  useEffect(() => {
    const emojis = parseEmojis(inputText);
    setDetectedEmojis(emojis);
  }, [inputText]);

  // Keyboard Shortcuts (Canvas Hotkeys)
  useEffect(() => {
    const handleKeyDownShortcuts = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return; 
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      
      // Delete / Backspace to clear active layer
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLayerId) {
          e.preventDefault();
          deleteLayer(selectedLayerId);
        }
      }
      
      // Ctrl + D (Duplicate)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedLayerId) {
          e.preventDefault();
          duplicateLayer(selectedLayerId);
        }
      }
      
      // Ctrl + C (Copy configuration)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedLayerId) {
          e.preventDefault();
          handleCopyLayer(selectedLayerId);
        }
      }
      
      // Ctrl + V (Paste configuration)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedLayerData) {
          e.preventDefault();
          handlePasteLayer();
        }
      }
      
      // Arrow nudge keys
      if (e.key.startsWith('Arrow') && selectedLayerId) {
        e.preventDefault();
        const speed = e.shiftKey ? 10 : 1;
        setLayers(prev => prev.map(l => {
          if (l.id === selectedLayerId) {
            let dx = 0, dy = 0;
            if (e.key === 'ArrowUp') dy = -speed;
            if (e.key === 'ArrowDown') dy = speed;
            if (e.key === 'ArrowLeft') dx = -speed;
            if (e.key === 'ArrowRight') dx = speed;
            return {
              ...l,
              x: l.x + dx,
              y: l.y + dy
            };
          }
          return l;
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDownShortcuts);
    return () => window.removeEventListener('keydown', handleKeyDownShortcuts);
  });

  // Handle wheel events for zooming the canvas with non-passive listener for preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = 1.08;
        if (e.deltaY < 0) {
          setCanvasZoom(prev => Math.min(prev * zoomFactor, 6.0));
        } else {
          setCanvasZoom(prev => Math.max(prev / zoomFactor, 0.25));
        }
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Handle resize events to adapt viewportSize state
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw canvas whenever settings change
  useEffect(() => {
    drawEditorCanvas();
  }, [
    layers,
    selectedLayerId,
    canvasZoom,
    panX,
    panY,
    bgType,
    solidBg,
    selectedGradient,
    borderRadius,
    exportSize,
    shadowEnabled,
    shadowColor,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY,
    selectedStyle,
    theme,
    viewportSize
  ]);

  const showToast = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCopyLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    setCopiedLayerData({
      id: layer.id,
      x: layer.x,
      y: layer.y,
      emoji: layer.emoji,
      style: layer.style,
      scale: layer.scale,
      rotation: layer.rotation,
      skewX: layer.skewX,
      skewY: layer.skewY,
      opacity: layer.opacity,
      flipX: layer.flipX,
      flipY: layer.flipY
    });
    showToast('Copied layer settings!');
  };

  const handlePasteLayer = () => {
    if (!copiedLayerData) return;
    pushStateToUndo(layers);
    const newLayer: Layer = {
      ...copiedLayerData,
      id: Date.now().toString(),
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 40
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    showToast('Layer pasted.');
  };

  const handleClearHistory = () => {
    setUploadHistory([]);
    try {
      localStorage.removeItem('emoji_studio_history');
    } catch {
      // storage unavailable
    }
    showToast('History cleared.');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('emoji_studio_keys', JSON.stringify(apiKeys));
    } catch {
      // storage unavailable
    }
    setSettingsOpen(false);
    showToast('API Keys saved successfully!');
  };

  const parseGradientColors = (gradientStr: string) => {
    if (!gradientStr || gradientStr === 'transparent') return [];
    return gradientStr.match(/(#[0-9a-fA-F]{3,8}|rgba?\(.*?\))/g) || [];
  };

  const loadImgPromise = (url: string): Promise<HTMLImageElement | 'failed'> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve('failed');
    });
  };

  // Helper to ensure all layer images are preloaded before exporting
  const ensureLayersLoaded = async (targetLayers: Layer[], defaultStyle: string) => {
    await Promise.all(
      targetLayers.map(async (layer) => {
        const url = getEmojiUrl(layer.emoji || '', layer.style || defaultStyle);
        if (!url) return;
        if (!imageCache.current[url] || imageCache.current[url] === 'loading') {
          const img = await loadImgPromise(url);
          imageCache.current[url] = img;
        }
      })
    );
  };

  // Math helper to get transformed control handle positions (TL, TR, BL, BR, Rotate)
  const getTransformPoints = (layer: Layer, size = 512) => {
    const cx = size / 2 + layer.x;
    const cy = size / 2 + layer.y;
    const es = 256 * layer.scale;
    
    const pts = {
      tl: { x: -es/2, y: -es/2 },
      tr: { x: es/2, y: -es/2 },
      bl: { x: -es/2, y: es/2 },
      br: { x: es/2, y: es/2 },
      rot: { x: 0, y: -es/2 - 28 } // stem dot
    };
    
    const rotRad = (layer.rotation || 0) * Math.PI / 180;
    const skewXRad = (layer.skewX || 0) * Math.PI / 180;
    const skewYRad = (layer.skewY || 0) * Math.PI / 180;
    
    const transformed: Record<string, { x: number; y: number }> = {};
    for (const [key, pt] of Object.entries(pts)) {
      let px = pt.x;
      let py = pt.y;

      if (layer.flipX) px = -px;
      if (layer.flipY) py = -py;
      
      // Apply skew transforms
      const sx = px + py * Math.tan(skewXRad);
      const sy = px * Math.tan(skewYRad) + py;
      
      // Apply rotation transforms
      const rx = sx * Math.cos(rotRad) - sy * Math.sin(rotRad);
      const ry = sx * Math.sin(rotRad) + sy * Math.cos(rotRad);
      
      transformed[key] = {
        x: cx + rx,
        y: cy + ry
      };
    }
    
    return transformed;
  };

  const requestCanvasRedraw = () => {
    if (redrawPending.current) return;
    redrawPending.current = true;
    requestAnimationFrame(() => {
      redrawPending.current = false;
      drawEditorCanvas();
    });
  };

  // Main draw coordinator for interactive canvas view
  const drawEditorCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = viewportSize.width;
    const height = viewportSize.height;
    
    // Support High-DPI screens without thrashing canvas buffer when size hasn't changed
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    
    setCanvasError('');

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (typeof ctx.setTransform === 'function') {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        ctx.scale(dpr, dpr);
      }
      render2D(ctx, width, height, false);
    } else {
      setCanvasError('Failed to initialize 2D context.');
    }
  };

  // Complete dynamic 2D rendering pipeline (used for preview & clean offscreen export)
  const render2D = (
    ctx: CanvasRenderingContext2D,
    widthOrSize: number,
    heightOrNull: number | null,
    isExport?: boolean
  ) => {
    if (isExport) {
      const size = widthOrSize;
      const scaleFactor = size / 512;
      
      // 1. Draw Artboard background & clip rounded corners
      ctx.save();
      const rad = (borderRadius / 100) * (size / 2);
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, rad);
      ctx.closePath();
      ctx.clip();
      
      if (bgType === 'solid') {
        ctx.fillStyle = solidBg;
        ctx.fillRect(0, 0, size, size);
      } else if (bgType === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        const colors = parseGradientColors(selectedGradient.value);
        if (colors.length > 1) {
          colors.forEach((color, idx) => {
            grad.addColorStop(idx / (colors.length - 1), color);
          });
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = colors[0] || '#eab308';
        }
        ctx.fillRect(0, 0, size, size);
      }
      ctx.restore();
      
      // 2. Draw layers
      layers.forEach((layer) => {
        if (layer.visible === false) return;
        const imgUrl = getEmojiUrl(layer.emoji || '', layer.style || selectedStyle);
        const img = imageCache.current[imgUrl];
        
        ctx.save();
        const cx = (512 / 2 + layer.x) * scaleFactor;
        const cy = (512 / 2 + layer.y) * scaleFactor;
        ctx.translate(cx, cy);

        if (layer.flipX || layer.flipY) {
          ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
        }
        
        if (layer.skewX || layer.skewY) {
          const sx = (layer.skewX || 0) * Math.PI / 180;
          const sy = (layer.skewY || 0) * Math.PI / 180;
          ctx.transform(1, Math.tan(sy), Math.tan(sx), 1, 0, 0);
        }
        
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
        ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
        
        if (shadowEnabled) {
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = (shadowBlur / 100) * size * layer.scale;
          ctx.shadowOffsetX = (shadowOffsetX / 100) * size * layer.scale;
          ctx.shadowOffsetY = (shadowOffsetY / 100) * size * layer.scale;
        }
        
        const emojiSize = 256 * layer.scale * scaleFactor;
        
        let drewImage = false;
        if (img && img !== 'failed' && img !== 'loading') {
          try {
            ctx.drawImage(img, -emojiSize / 2, -emojiSize / 2, emojiSize, emojiSize);
            drewImage = true;
          } catch {
            drewImage = false;
          }
        }
        if (!drewImage) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#18181b';
          ctx.font = `${emojiSize * 0.7}px system-ui, Segoe UI`;
          ctx.fillText(layer.emoji || '', 0, 0);
        }
        ctx.restore();
      });
      return;
    }
    
    // Interactive viewport rendering
    const width = widthOrSize;
    const height = heightOrNull ?? 800;
    
    // 1. Draw Viewport Background (gray workspace space)
    ctx.fillStyle = theme === 'dark' ? '#09090b' : '#f4f4f5';
    ctx.fillRect(0, 0, width, height);
    
    // 2. Draw dot matrix background
    ctx.save();
    const gridSize = 32 * canvasZoom;
    const startX = (width / 2 + panX) % gridSize;
    const startY = (height / 2 + panY) % gridSize;
    ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    for (let x = startX; x < width; x += gridSize) {
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.restore();
    
    // 3. Apply Viewport Scale/Translate
    ctx.save();
    ctx.translate(width / 2 + panX, height / 2 + panY);
    ctx.scale(canvasZoom, canvasZoom);
    ctx.translate(-256, -256); // center the 512x512 artboard
    
    // 4. Draw Artboard boundary, clip background rounded corners
    ctx.save();
    const rad = (borderRadius / 100) * 256; // 512 / 2 = 256
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 512, rad);
    ctx.closePath();
    ctx.clip();
    
    if (bgType === 'transparent') {
      // Checkerboard inside artboard boundaries
      ctx.fillStyle = theme === 'dark' ? '#18181b' : '#e4e4e7';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = theme === 'dark' ? '#27272a' : '#f4f4f5';
      const checkSize = 16;
      for (let x = 0; x < 512; x += checkSize * 2) {
        for (let y = 0; y < 512; y += checkSize * 2) {
          ctx.fillRect(x, y, checkSize, checkSize);
          ctx.fillRect(x + checkSize, y + checkSize, checkSize, checkSize);
        }
      }
    } else if (bgType === 'solid') {
      ctx.fillStyle = solidBg;
      ctx.fillRect(0, 0, 512, 512);
    } else if (bgType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      const colors = parseGradientColors(selectedGradient.value);
      if (colors.length > 1) {
        colors.forEach((color, idx) => {
          grad.addColorStop(idx / (colors.length - 1), color);
        });
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = colors[0] || '#eab308';
      }
      ctx.fillRect(0, 0, 512, 512);
    }
    ctx.restore(); // end of background clip
    
    // Draw artboard outline boundaries
    ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = Math.max(1.5, 2 / canvasZoom);
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 512, rad);
    ctx.stroke();
    
    // 5. Draw layers
    layers.forEach((layer) => {
      if (layer.visible === false) return;
      const imgUrl = getEmojiUrl(layer.emoji || '', layer.style || selectedStyle);
      let img = imageCache.current[imgUrl];

      // Proactively trigger image load if not cached
      if (!img) {
        imageCache.current[imgUrl] = 'loading';
        const imgElement = new Image();
        imgElement.crossOrigin = 'anonymous';
        imgElement.src = imgUrl;
        imgElement.onload = () => {
          imageCache.current[imgUrl] = imgElement;
          requestCanvasRedraw();
        };
        imgElement.onerror = () => {
          imageCache.current[imgUrl] = 'failed';
          requestCanvasRedraw();
        };
        img = 'loading';
      }

      const cx = 512 / 2 + layer.x;
      const cy = 512 / 2 + layer.y;
      
      ctx.save();
      ctx.translate(cx, cy);

      if (layer.flipX || layer.flipY) {
        ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
      }
      
      if (layer.skewX || layer.skewY) {
        const sx = (layer.skewX || 0) * Math.PI / 180;
        const sy = (layer.skewY || 0) * Math.PI / 180;
        ctx.transform(1, Math.tan(sy), Math.tan(sx), 1, 0, 0);
      }
      
      ctx.rotate((layer.rotation || 0) * Math.PI / 180);
      ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
      
      if (shadowEnabled) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = (shadowBlur / 100) * 512 * layer.scale;
        ctx.shadowOffsetX = (shadowOffsetX / 100) * 512 * layer.scale;
        ctx.shadowOffsetY = (shadowOffsetY / 100) * 512 * layer.scale;
      }
      
      const emojiSize = 256 * layer.scale;
      
      let drewImage = false;
      if (img && img !== 'failed' && img !== 'loading') {
        try {
          ctx.drawImage(img, -emojiSize / 2, -emojiSize / 2, emojiSize, emojiSize);
          drewImage = true;
        } catch {
          drewImage = false;
        }
      }
      if (!drewImage) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#18181b';
        ctx.font = `${emojiSize * 0.7}px system-ui, Segoe UI`;
        ctx.fillText(layer.emoji || '', 0, 0);
      }
      ctx.restore();
      
      // 6. Draw selection bounding box and handles
      if (layer.id === selectedLayerId) {
        ctx.save();
        ctx.translate(cx, cy);
        if (layer.skewX || layer.skewY) {
          const sx = (layer.skewX || 0) * Math.PI / 180;
          const sy = (layer.skewY || 0) * Math.PI / 180;
          ctx.transform(1, Math.tan(sy), Math.tan(sx), 1, 0, 0);
        }
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
        
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = Math.max(1.5, 2.5 / canvasZoom);
        ctx.setLineDash([4 / canvasZoom, 4 / canvasZoom]);
        const es = 256 * layer.scale;
        ctx.strokeRect(-es / 2 - 2, -es / 2 - 2, es + 4, es + 4);
        
        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = theme === 'dark' ? '#09090b' : '#ffffff';
        ctx.lineWidth = Math.max(1, 1.5 / canvasZoom);
        ctx.setLineDash([]); // solid lines
        
        const hs = Math.max(7, 10 / canvasZoom);
        const drawHandle = (hx: number, hy: number) => {
          ctx.beginPath();
          ctx.arc(hx, hy, hs / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        };

        drawHandle(-es/2 - 2, -es/2 - 2);
        drawHandle(es/2 + 2, -es/2 - 2);
        drawHandle(-es/2 - 2, es/2 + 2);
        drawHandle(es/2 + 2, es/2 + 2);
        
        // Rotation handle connection stem
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = Math.max(1, 1.5 / canvasZoom);
        ctx.beginPath();
        ctx.moveTo(0, -es/2 - 2);
        ctx.lineTo(0, -es/2 - 28);
        ctx.stroke();
        
        drawHandle(0, -es/2 - 28);
        ctx.restore();
      }
    });
    
    ctx.restore(); // restore viewport transform
  };

  const drawExportCanvas = (targetSize: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      render2D(ctx, targetSize, null, true);
    }
    return canvas;
  };

  const addLayer = (emojiChar: string) => {
    pushStateToUndo(layers);
    const newLayer: Layer = {
      id: Date.now().toString(),
      emoji: emojiChar,
      style: selectedStyle, 
      x: (Math.random() - 0.5) * 50, 
      y: (Math.random() - 0.5) * 50,
      scale: 0.85,
      rotation: 0,
      skewX: 0,
      skewY: 0,
      opacity: 1.0
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    showToast('Layer added to workspace.');
  };

  const addLayerWithStyle = (emojiChar: string, styleId: string) => {
    pushStateToUndo(layers);
    const newLayer: Layer = {
      id: Date.now().toString(),
      emoji: emojiChar,
      style: styleId,
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
      scale: 0.85,
      rotation: 0,
      skewX: 0,
      skewY: 0,
      opacity: 1.0
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    showToast(`Added layer in ${EMOJI_STYLES.find(s => s.id === styleId)?.name || styleId} style.`);
  };

  const getLayerAtPosition = (artX: number, artY: number) => {
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.visible === false) continue;
      const lx = 512 / 2 + layer.x;
      const ly = 512 / 2 + layer.y;
      const es = 256 * layer.scale;
      
      if (artX >= lx - es/2 && artX <= lx + es/2 &&
          artY >= ly - es/2 && artY <= ly + es/2) {
        return layer.id;
      }
    }
    return null;
  };

  // Canvas Mouse down: Hit detection for translation vs transform handles
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      // Right click handled by context menu listener
      return;
    }

    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const width = rect.width;
    const height = rect.height;
    
    const artX = (cx - width / 2 - panX) / canvasZoom + 256;
    const artY = (cy - height / 2 - panY) / canvasZoom + 256;
    
    // Check if clicked one of active layer handles
    const activeLayer = layers.find(l => l.id === selectedLayerId);
    if (activeLayer) {
      const handles = getTransformPoints(activeLayer);
      const hitTolerance = 14 / canvasZoom;
      let hitHandle: string | null = null;

      for (const [key, handle] of Object.entries(handles)) {
        if (Math.hypot(artX - handle.x, artY - handle.y) < hitTolerance) {
          hitHandle = key;
          break;
        }
      }

      if (hitHandle) {
        setInteractionMode(hitHandle === 'rot' ? 'rotate' : 'scale_' + hitHandle);
        dragStart.current = { 
          mouseX: artX, 
          mouseY: artY, 
          layerX: activeLayer.x, 
          layerY: activeLayer.y, 
          layerScale: activeLayer.scale, 
          layerRotation: activeLayer.rotation 
        };
        return;
      }
    }

    // Otherwise check layer dragging
    const clickedId = getLayerAtPosition(artX, artY);
    if (clickedId) {
      setSelectedLayerId(clickedId);
      setInteractionMode('drag');
      const layer = layers.find(l => l.id === clickedId);
      if (layer) {
        dragStart.current = { 
          mouseX: artX, 
          mouseY: artY, 
          layerX: layer.x, 
          layerY: layer.y, 
          layerScale: layer.scale, 
          layerRotation: layer.rotation 
        };
      }
    } else {
      setSelectedLayerId(null);
      setInteractionMode(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanX(prev => prev + dx);
      setPanY(prev => prev + dy);
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const width = rect.width;
    const height = rect.height;
    
    const artX = (cx - width / 2 - panX) / canvasZoom + 256;
    const artY = (cy - height / 2 - panY) / canvasZoom + 256;

    const activeLayer = layers.find(l => l.id === selectedLayerId);

    if (interactionMode === 'drag' && activeLayer) {
      const dx = artX - dragStart.current.mouseX;
      const dy = artY - dragStart.current.mouseY;
      setLayers(prev => prev.map(l => {
        if (l.id === selectedLayerId) {
          return {
            ...l,
            x: dragStart.current.layerX + dx,
            y: dragStart.current.layerY + dy
          };
        }
        return l;
      }));
    } else if (interactionMode === 'rotate' && activeLayer) {
      const layerCx = 512 / 2 + activeLayer.x;
      const layerCy = 512 / 2 + activeLayer.y;
      
      const angleCurrent = Math.atan2(artY - layerCy, artX - layerCx);
      const angleStart = Math.atan2(dragStart.current.mouseY - layerCy, dragStart.current.mouseX - layerCx);
      const angleDiff = (angleCurrent - angleStart) * 180 / Math.PI;
      
      setLayers(prev => prev.map(l => {
        if (l.id === selectedLayerId) {
          return {
            ...l,
            rotation: (dragStart.current.layerRotation + angleDiff) % 360
          };
        }
        return l;
      }));
    } else if (interactionMode && interactionMode.startsWith('scale_') && activeLayer) {
      const layerCx = 512 / 2 + activeLayer.x;
      const layerCy = 512 / 2 + activeLayer.y;
      
      const distCurrent = Math.hypot(artX - layerCx, artY - layerCy);
      const distStart = Math.hypot(dragStart.current.mouseX - layerCx, dragStart.current.mouseY - layerCy);
      const scaleRatio = distStart > 0 ? distCurrent / distStart : 1;
      
      setLayers(prev => prev.map(l => {
        if (l.id === selectedLayerId) {
          return {
            ...l,
            scale: Math.max(0.1, Math.min(dragStart.current.layerScale * scaleRatio, 4.0))
          };
        }
        return l;
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setInteractionMode(null);
    setIsPanning(false);
  };

  // Context Menu activation (suppress standard right click)
  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const width = rect.width;
    const height = rect.height;
    
    const artX = (cx - width / 2 - panX) / canvasZoom + 256;
    const artY = (cy - height / 2 - panY) / canvasZoom + 256;
    
    const clickedId = getLayerAtPosition(artX, artY);
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      layerId: clickedId
    });
  };

  // Mobile Touch Gestures
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const cx = touch.clientX - rect.left;
      const cy = touch.clientY - rect.top;
      
      const width = rect.width;
      const height = rect.height;
      
      const artX = (cx - width / 2 - panX) / canvasZoom + 256;
      const artY = (cy - height / 2 - panY) / canvasZoom + 256;
      
      // Check handles first
      const activeLayer = layers.find(l => l.id === selectedLayerId);
      if (activeLayer) {
        const handles = getTransformPoints(activeLayer);
        const hitTolerance = 18 / canvasZoom;
        let hitHandle: string | null = null;

        for (const [key, handle] of Object.entries(handles)) {
          if (Math.hypot(artX - handle.x, artY - handle.y) < hitTolerance) {
            hitHandle = key;
            break;
          }
        }

        if (hitHandle) {
          setInteractionMode(hitHandle === 'rot' ? 'rotate' : 'scale_' + hitHandle);
          dragStart.current = { 
            mouseX: artX, 
            mouseY: artY, 
            layerX: activeLayer.x, 
            layerY: activeLayer.y, 
            layerScale: activeLayer.scale, 
            layerRotation: activeLayer.rotation 
          };
          return;
        }
      }

      const clickedId = getLayerAtPosition(artX, artY);
      if (clickedId) {
        setSelectedLayerId(clickedId);
        setInteractionMode('drag');
        const layer = layers.find(l => l.id === clickedId);
        if (layer) {
          dragStart.current = { 
            mouseX: artX, 
            mouseY: artY, 
            layerX: layer.x, 
            layerY: layer.y, 
            layerScale: layer.scale, 
            layerRotation: layer.rotation 
          };
        }
      } else {
        // One finger on empty space pans on touch devices
        setIsPanning(true);
        panStart.current = { x: touch.clientX, y: touch.clientY };
      }
    } else if (e.touches.length === 2) {
      setInteractionMode(null);
      setIsPanning(false);
      
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartDist.current = dist;
      touchStartZoom.current = canvasZoom;
      
      if (selectedLayerId) {
        const active = layers.find(l => l.id === selectedLayerId);
        if (active) {
          touchStartLayerScale.current = active.scale;
        }
      }
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isPanning) {
        const dx = touch.clientX - panStart.current.x;
        const dy = touch.clientY - panStart.current.y;
        setPanX(prev => prev + dx);
        setPanY(prev => prev + dy);
        panStart.current = { x: touch.clientX, y: touch.clientY };
        return;
      }

      if (interactionMode && selectedLayerId) {
        const rect = canvas.getBoundingClientRect();
        const cx = touch.clientX - rect.left;
        const cy = touch.clientY - rect.top;
        
        const width = rect.width;
        const height = rect.height;
        
        const artX = (cx - width / 2 - panX) / canvasZoom + 256;
        const artY = (cy - height / 2 - panY) / canvasZoom + 256;

        const activeLayer = layers.find(l => l.id === selectedLayerId);
        if (!activeLayer) return;

        if (interactionMode === 'drag') {
          const dx = artX - dragStart.current.mouseX;
          const dy = artY - dragStart.current.mouseY;
          setLayers(prev => prev.map(l => {
            if (l.id === selectedLayerId) {
              return {
                ...l,
                x: dragStart.current.layerX + dx,
                y: dragStart.current.layerY + dy
              };
            }
            return l;
          }));
        } else if (interactionMode === 'rotate') {
          const layerCx = 512 / 2 + activeLayer.x;
          const layerCy = 512 / 2 + activeLayer.y;
          const angleCurrent = Math.atan2(artY - layerCy, artX - layerCx);
          const angleStart = Math.atan2(dragStart.current.mouseY - layerCy, dragStart.current.mouseX - layerCx);
          const angleDiff = (angleCurrent - angleStart) * 180 / Math.PI;
          setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, rotation: (dragStart.current.layerRotation + angleDiff) % 360 } : l));
        } else if (interactionMode.startsWith('scale_')) {
          const layerCx = 512 / 2 + activeLayer.x;
          const layerCy = 512 / 2 + activeLayer.y;
          const distCurrent = Math.hypot(artX - layerCx, artY - layerCy);
          const distStart = Math.hypot(dragStart.current.mouseX - layerCx, dragStart.current.mouseY - layerCy);
          const scaleRatio = distStart > 0 ? distCurrent / distStart : 1;
          setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, scale: Math.max(0.1, Math.min(dragStart.current.layerScale * scaleRatio, 4.0)) } : l));
        }
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      
      if (touchStartDist.current > 0) {
        const factor = dist / touchStartDist.current;
        if (selectedLayerId) {
          setLayers(prev => prev.map(l => {
            if (l.id === selectedLayerId) {
              return {
                ...l,
                scale: Math.max(0.15, Math.min(touchStartLayerScale.current * factor, 3.5))
              };
            }
            return l;
          }));
        } else {
          setCanvasZoom(Math.max(0.25, Math.min(touchStartZoom.current * factor, 5.0)));
        }
      }
    }
  };

  const handleCanvasTouchEnd = () => {
    setInteractionMode(null);
    setIsPanning(false);
    touchStartDist.current = 0;
  };

  const moveLayerUp = (id: string) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx === -1 || idx === layers.length - 1) return;
    pushStateToUndo(layers);
    const newLayers = [...layers];
    const temp = newLayers[idx];
    newLayers[idx] = newLayers[idx + 1];
    newLayers[idx + 1] = temp;
    setLayers(newLayers);
  };

  const moveLayerDown = (id: string) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx === -1 || idx === 0) return;
    pushStateToUndo(layers);
    const newLayers = [...layers];
    const temp = newLayers[idx];
    newLayers[idx] = newLayers[idx - 1];
    newLayers[idx - 1] = temp;
    setLayers(newLayers);
  };

  const duplicateLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    pushStateToUndo(layers);
    const newLayer: Layer = {
      ...layer,
      id: Date.now().toString(),
      x: layer.x + 20, 
      y: layer.y + 20
    };
    const idx = layers.findIndex(l => l.id === id);
    const newLayers = [...layers];
    newLayers.splice(idx + 1, 0, newLayer);
    setLayers(newLayers);
    setSelectedLayerId(newLayer.id);
    showToast('Layer duplicated.');
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) {
      showToast('At least one layer must remain in workspace!');
      return;
    }
    pushStateToUndo(layers);
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    setSelectedLayerId(newLayers[newLayers.length - 1].id);
    showToast('Layer deleted.');
  };

  const handleDownloadPNG = () => {
    const exportCanvas = drawExportCanvas(exportSize);
    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    const firstEmoji = layers[0]?.emoji || 'sticker';
    link.download = `smolji_${firstEmoji}_sticker_${exportSize}px.png`;
    link.href = dataUrl;
    link.click();
    showToast('PNG saved!');
  };

  const handleCopyToClipboard = async () => {
    await ensureLayersLoaded(layers, selectedStyle);
    const exportCanvas = drawExportCanvas(exportSize);
    try {
      exportCanvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Blob creation failed');
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        showToast('Copied sticker to clipboard!');
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showToast('Clipboard copy failed. Try downloading PNG instead.');
    }
  };

  const handleUploadImage = async (service: 'imgbb' | 'imgur') => {
    const apiKey = service === 'imgbb' ? apiKeys.imgbb : apiKeys.imgur;
    
    if (!apiKey) {
      setSettingsOpen(true);
      showToast(`Please configure ${service === 'imgbb' ? 'ImgBB' : 'Imgur'} settings first.`);
      return;
    }

    setIsUploading(service);
    setUploadResultUrl('');

    await ensureLayersLoaded(layers, selectedStyle);
    const exportCanvas = drawExportCanvas(exportSize);
    exportCanvas.toBlob(async (blob) => {
      if (!blob) {
        setIsUploading('');
        showToast('Image processing error');
        return;
      }

      try {
        let uploadedUrl = '';
        if (service === 'imgbb') {
          uploadedUrl = await uploadToImgBB(blob, apiKeys.imgbb);
        } else {
          uploadedUrl = await uploadToImgur(blob, apiKeys.imgur);
        }

        setUploadResultUrl(uploadedUrl);
        addToHistory(uploadedUrl, service === 'imgbb' ? 'ImgBB' : 'Imgur');
        showToast('Public image URL created!');
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : 'Error occurred during upload';
        showToast(msg);
      } finally {
        setIsUploading('');
      }
    }, 'image/png');
  };

  const addToHistory = (url: string, host: string) => {
    const newEntry: UploadedHistory = {
      id: Date.now().toString(),
      emoji: layers[0]?.emoji || '🔥',
      style: selectedStyle,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      host,
      url
    };
    const updated = [newEntry, ...uploadHistory].slice(0, 10);
    setUploadHistory(updated);
    try {
      localStorage.setItem('emoji_studio_history', JSON.stringify(updated));
    } catch {
      // storage unavailable
    }
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    const folder = zip.folder(`smolji_pack`);
    
    showToast('Compiling ZIP for all emoji styles...');
    
    for (const style of EMOJI_STYLES) {
      const styleCanvas = document.createElement('canvas');
      styleCanvas.width = exportSize;
      styleCanvas.height = exportSize;
      const sCtx = styleCanvas.getContext('2d');
      if (!sCtx) continue;
      const size = exportSize;
      const scaleFactor = size / 512;
      
      // Draw background
      sCtx.save();
      const rad = (borderRadius / 100) * (size / 2);
      sCtx.beginPath();
      sCtx.roundRect(0, 0, size, size, rad);
      sCtx.closePath();
      sCtx.clip();
      
      if (bgType === 'solid') {
        sCtx.fillStyle = solidBg;
        sCtx.fillRect(0, 0, size, size);
      } else if (bgType === 'gradient') {
        const grad = sCtx.createLinearGradient(0, 0, size, size);
        const colors = parseGradientColors(selectedGradient.value);
        if (colors.length > 1) {
          colors.forEach((color, idx) => {
            grad.addColorStop(idx / (colors.length - 1), color);
          });
          sCtx.fillStyle = grad;
        } else {
          sCtx.fillStyle = colors[0] || '#eab308';
        }
        sCtx.fillRect(0, 0, size, size);
      }
      sCtx.restore();
      
      // Draw layers with overridden style
      for (const layer of layers) {
        if (layer.visible === false) continue;
        const imgUrl = getEmojiUrl(layer.emoji || '', style.id);
        let img = imageCache.current[imgUrl];
        
        if (!img || img === 'failed') {
          img = await loadImgPromise(imgUrl);
          if (img !== 'failed') {
            imageCache.current[imgUrl] = img;
          }
        }
        
        sCtx.save();
        const cx = (512 / 2 + layer.x) * scaleFactor;
        const cy = (512 / 2 + layer.y) * scaleFactor;
        sCtx.translate(cx, cy);

        if (layer.flipX || layer.flipY) {
          sCtx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
        }
        
        if (layer.skewX || layer.skewY) {
          const sx = (layer.skewX || 0) * Math.PI / 180;
          const sy = (layer.skewY || 0) * Math.PI / 180;
          sCtx.transform(1, Math.tan(sy), Math.tan(sx), 1, 0, 0);
        }
        
        sCtx.rotate((layer.rotation || 0) * Math.PI / 180);
        sCtx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
        
        if (shadowEnabled) {
          sCtx.shadowColor = shadowColor;
          sCtx.shadowBlur = (shadowBlur / 100) * size * layer.scale;
          sCtx.shadowOffsetX = (shadowOffsetX / 100) * size * layer.scale;
          sCtx.shadowOffsetY = (shadowOffsetY / 100) * size * layer.scale;
        }
        
        const emojiSize = 256 * layer.scale * scaleFactor;
        
        if (img && img !== 'failed' && img !== 'loading') {
          sCtx.drawImage(img, -emojiSize / 2, -emojiSize / 2, emojiSize, emojiSize);
        } else {
          sCtx.textAlign = 'center';
          sCtx.textBaseline = 'middle';
          sCtx.fillStyle = '#ffffff';
          sCtx.font = `${emojiSize * 0.7}px system-ui, Segoe UI`;
          sCtx.fillText(layer.emoji || '', 0, 0);
        }
        sCtx.restore();
      }
      
      const blob = await new Promise<Blob | null>((resolve) => styleCanvas.toBlob(resolve, 'image/png'));
      if (blob && folder) folder.file(`${style.id}.png`, blob);
    }
    
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `smolji_sticker_pack.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast('ZIP folder downloaded!');
    } catch {
      showToast('Error building ZIP package.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    
    // Auto replace completed shortcodes using O(1) map
    const replaced = val.replace(/:([a-zA-Z0-9_\-+]+):/g, (match, name) => {
      const found = SHORTCODE_MAP.get(name.toLowerCase());
      return found || match;
    });

    setInputText(replaced);
    
    // Suggestion box filter
    const caret = getCaretInfo(e.target, replaced);
    if (caret && caret.query.length >= 1) {
      startTransition(() => {
        const list = getGemojiList();
        const query = caret.query.toLowerCase();
        
        const filtered = list.filter(item => {
          return item.names.some(name => name.includes(query)) ||
                 item.tags.some(tag => tag.includes(query)) ||
                 item.description.toLowerCase().includes(query);
        }).slice(0, 5);
        
        setSuggestions(filtered);
        setCaretInfo(caret);
        setSuggestionIndex(0);
      });
    } else {
      setSuggestions([]);
      setCaretInfo(null);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (suggestions[suggestionIndex]) {
          insertSuggestion(suggestions[suggestionIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions([]);
        setCaretInfo(null);
        return;
      }
    }
  };

  const getCaretInfo = (element: HTMLTextAreaElement, text: string) => {
    const selectionEnd = element.selectionEnd;
    const textBeforeCursor = text.slice(0, selectionEnd);
    const lastColonIndex = textBeforeCursor.lastIndexOf(':');
    
    if (lastColonIndex !== -1) {
      const textAfterColon = textBeforeCursor.slice(lastColonIndex + 1);
      if (!textAfterColon.includes(' ') && !textAfterColon.includes('\n') && !textAfterColon.includes(':')) {
        return {
          query: textAfterColon,
          startIndex: lastColonIndex,
          endIndex: selectionEnd
        };
      }
    }
    return null;
  };

  const insertSuggestion = (emojiItem: SuggestionItem) => {
    if (!caretInfo) return;
    const text = inputText;
    const before = text.slice(0, caretInfo.startIndex);
    const after = text.slice(caretInfo.endIndex);
    
    const newText = before + emojiItem.emoji + after;
    setInputText(newText);
    setSuggestions([]);
    setCaretInfo(null);
    
    addLayer(emojiItem.emoji);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = caretInfo.startIndex + emojiItem.emoji.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const activeLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200 select-none">
      
      {/* 1. Full-screen interactive canvas */}
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onContextMenu={handleCanvasContextMenu}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
        className="absolute inset-0 w-full h-full block cursor-default"
        style={{
          cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : (interactionMode ? 'grabbing' : 'default')
        }}
      />

      {/* 2. Floating Navbar (Header) */}
      <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-4 pointer-events-none">
        
        {/* Logo block */}
        <div className="flex items-center gap-3 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/60 px-4 py-2.5 rounded-2xl shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-xl object-cover ring-1 ring-zinc-200/80 dark:ring-zinc-700/80 shadow-sm" />
            <div>
              <h1 className="text-sm font-black tracking-tight text-yellow-600 dark:text-yellow-400 leading-none">Smolji</h1>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5 font-bold">Studio</p>
            </div>
          </div>
        </div>

        {/* Center zoom & history controls */}
        <div className="flex items-center gap-1.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/60 p-1.5 rounded-2xl shadow-xl pointer-events-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
          <button
            type="button"
            onClick={() => setCanvasZoom(prev => Math.max(prev - 0.15, 0.25))}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300 px-1.5 text-center min-w-11 tabular-nums">
            {Math.round(canvasZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setCanvasZoom(prev => Math.min(prev + 0.15, 6.0))}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setPanX(0);
              setPanY(0);
              setCanvasZoom(0.85);
            }}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border-l border-zinc-200 dark:border-zinc-800 pl-2 ml-0.5 cursor-pointer transition-colors"
            title="Recenter view"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/60 p-1.5 rounded-2xl shadow-xl pointer-events-auto">
          <button
            type="button"
            onClick={() => setLeftPanelOpen(prev => !prev)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              leftPanelOpen 
                ? 'border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' 
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
            title="Toggle Asset Library Panel"
          >
            <Smile className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px]">Library</span>
          </button>

          <button
            type="button"
            onClick={() => setRightPanelOpen(prev => !prev)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              rightPanelOpen 
                ? 'border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' 
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
            title="Toggle Layer Properties Panel"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px]">Properties</span>
          </button>

          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="p-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white rounded-xl text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-800 flex items-center gap-1 cursor-pointer"
            title="Copy PNG sticker image to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="px-3.5 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            title="Download PNG sticker file"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">Save PNG</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. Floating Left Sidebar Panel (Asset Library) */}
      <aside 
        className={`absolute top-20 left-4 bottom-4 z-20 w-80 pointer-events-none transition-transform duration-300 ease-out ${
          leftPanelOpen ? 'transform translate-x-0' : 'transform -translate-x-96'
        }`}
      >
        <div className="w-full h-full bg-white/80 dark:bg-zinc-950/85 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 overflow-y-auto pointer-events-auto">
          <div className="border-b border-zinc-200 dark:border-zinc-900 pb-3 flex items-center justify-between gap-2 shrink-0">
            <h2 className="text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400 flex items-center gap-2 shrink-0">
              <Smile className="w-4 h-4" />
              Studio Assets
            </h2>
            <div className="w-36 shrink-0" title="Default Style for new Emojis">
              <StudioSelect<string>
                id="default-style"
                ariaLabel="Default Style for new Emojis"
                value={selectedStyle}
                options={EMOJI_STYLES.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
                onChange={(val) => setSelectedStyle(val)}
              />
            </div>
          </div>

          {/* Autocomplete input */}
          <div className="relative shrink-0">
            <textarea
              ref={textareaRef}
              rows={2}
              className="w-full rounded-xl bg-zinc-100/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 px-3 py-2 text-zinc-800 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 transition-all font-sans resize-none text-xs"
              placeholder="Search emoji by shortcode (e.g. :smile:)..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown} 
            />
            
            {/* Suggestions drop DOWN */}
            {suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 mt-1.5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertSuggestion(item)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors group text-xs ${
                      suggestionIndex === idx 
                        ? 'bg-yellow-500 text-zinc-950 font-bold' 
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <span className="font-mono text-[9px] text-zinc-400 group-hover:text-white">
                        :{item.names[0]}:
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detected list */}
          {detectedEmojis.length > 0 && (
            <div className="shrink-0">
              <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Detected Emojis</span>
              <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-24 overflow-y-auto">
                {detectedEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => addLayer(emoji)}
                    className="text-lg p-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 transition-all transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick presets */}
          <div className="flex-1 flex flex-col min-h-0">
            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 shrink-0">Library Quick Emojis</span>
            <div className="grid grid-cols-6 gap-1.5 p-2 bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-y-auto flex-1 min-h-0">
              {ALL_POPULAR_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addLayer(emoji)}
                  className="text-lg p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center transform active:scale-95 text-zinc-700 dark:text-zinc-300"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Ad space */}
          <div className="bg-zinc-100/50 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl h-20 flex items-center justify-center text-center p-2 mt-auto shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 dark:text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-1">
                <Megaphone className="w-3 h-3" /> Google AdSense
              </span>
              <span className="text-[7.5px] text-zinc-400 dark:text-zinc-500">Reserved monetization space</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 4. Floating Right Sidebar Panel (Layers, Properties & Artboard Settings) */}
      <aside 
        className={`absolute top-20 right-4 bottom-4 z-20 w-80 pointer-events-none transition-transform duration-300 ease-out ${
          rightPanelOpen ? 'transform translate-x-0' : 'transform translate-x-96'
        }`}
      >
        <div className="w-full h-full bg-white/80 dark:bg-zinc-950/85 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 overflow-y-auto pointer-events-auto">
          
          <div className="border-b border-zinc-200 dark:border-zinc-900 pb-3 flex items-center justify-between sticky top-0 bg-white/50 dark:bg-zinc-950/50 z-10 shrink-0">
            <h2 className="text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Layers Hierarchy
            </h2>
            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-mono">z-ordered</span>
          </div>

          {/* Layers List */}
          {layers.length > 0 && (
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto shrink-0 bg-zinc-100/20 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2">
              {layers.map((layer, idx) => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    selectedLayerId === layer.id
                      ? 'bg-yellow-500/10 border-yellow-500 text-zinc-900 dark:text-white'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{layer.emoji}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold truncate">Layer {layers.length - idx}</span>
                      <span className="text-[7.5px] text-zinc-500 truncate font-mono uppercase tracking-wider">
                        {EMOJI_STYLES.find(s => s.id === layer.style)?.name || layer.style}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => moveLayerUp(layer.id)}
                      disabled={idx === layers.length - 1}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded disabled:opacity-30 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveLayerDown(layer.id)}
                      disabled={idx === 0}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded disabled:opacity-30 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteLayer(layer.id)}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-500"
                      title="Delete Layer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Layer Transformations */}
          {activeLayer ? (
            <div className="border-t border-zinc-200 dark:border-zinc-900 pt-3 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider block">Layer Properties</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      pushStateToUndo(layers);
                      setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, flipX: !l.flipX } : l));
                    }}
                    className={`p-1 rounded border text-[9px] flex items-center gap-0.5 ${
                      activeLayer.flipX 
                        ? 'bg-yellow-500 text-zinc-950 border-yellow-500 font-bold' 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      pushStateToUndo(layers);
                      setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, flipY: !l.flipY } : l));
                    }}
                    className={`p-1 rounded border text-[9px] flex items-center gap-0.5 ${
                      activeLayer.flipY 
                        ? 'bg-yellow-500 text-zinc-950 border-yellow-500 font-bold' 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* Visual Style Selection */}
              <div className="space-y-1.5">
                <label htmlFor="layer-style" className="block text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Visual Style</label>
                <StudioSelect
                  id="layer-style"
                  ariaLabel="Visual Style"
                  value={activeLayer.style || selectedStyle}
                  options={EMOJI_STYLES.map(s => ({
                    value: s.id,
                    label: s.name,
                    badge: s.format,
                  }))}
                  onChange={(styleId) => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, style: styleId } : l))}
                />
              </div>

              {/* Sliders grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <StudioSlider
                  label="Scale"
                  valueDisplay={`${Math.round(activeLayer.scale * 100)}%`}
                  min={0.1}
                  max={2.5}
                  step={0.05}
                  value={activeLayer.scale}
                  onChange={(val) => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, scale: val } : l))}
                  onReset={() => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, scale: 0.85 } : l))}
                />

                <StudioSlider
                  label="Rotation"
                  valueDisplay={`${activeLayer.rotation}°`}
                  min={-180}
                  max={180}
                  step={1}
                  value={activeLayer.rotation}
                  onChange={(val) => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, rotation: Math.round(val) } : l))}
                  onReset={() => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, rotation: 0 } : l))}
                />

                <StudioSlider
                  label="Skew X"
                  valueDisplay={`${activeLayer.skewX || 0}°`}
                  min={-45}
                  max={45}
                  step={1}
                  value={activeLayer.skewX || 0}
                  onChange={(val) => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, skewX: Math.round(val) } : l))}
                  onReset={() => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, skewX: 0 } : l))}
                />

                <StudioSlider
                  label="Skew Y"
                  valueDisplay={`${activeLayer.skewY || 0}°`}
                  min={-45}
                  max={45}
                  step={1}
                  value={activeLayer.skewY || 0}
                  onChange={(val) => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, skewY: Math.round(val) } : l))}
                  onReset={() => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, skewY: 0 } : l))}
                />

                <StudioSlider
                  label="Opacity"
                  valueDisplay={`${Math.round((activeLayer.opacity !== undefined ? activeLayer.opacity : 1) * 100)}%`}
                  min={0}
                  max={1}
                  step={0.05}
                  value={activeLayer.opacity !== undefined ? activeLayer.opacity : 1}
                  onChange={(val) => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, opacity: val } : l))}
                  onReset={() => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, opacity: 1 } : l))}
                  className="col-span-2"
                />
              </div>

              {/* Style Explorer variations for selected layer */}
              <div className="mt-2 space-y-1">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Style Variations Explorer</span>
                <div className="grid grid-cols-4 gap-1.5 max-h-24 overflow-y-auto p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  {EMOJI_STYLES.map(style => {
                    const url = getEmojiUrl(activeLayer.emoji || '', style.id);
                    const isActive = activeLayer.style === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, style: style.id } : l))}
                        className={`p-1 border rounded flex flex-col items-center justify-center cursor-pointer transition-colors relative group ${
                          isActive ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <img src={url} alt={style.name} loading="lazy" className="w-5 h-5 object-contain" />
                        <span className="text-[5px] text-zinc-500 text-center truncate w-full font-mono mt-0.5">{style.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addLayerWithStyle(activeLayer.emoji || '', style.id);
                          }}
                          className="absolute -top-1 -right-1 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          title="Spawn new Layer in this style"
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-zinc-200 dark:border-zinc-900 pt-4 text-center text-[10px] text-zinc-500 italic shrink-0">
              No layer selected. Select an emoji on the canvas.
            </div>
          )}

          {/* Global Artboard Customizations */}
          <div className="border-t border-zinc-200 dark:border-zinc-900 pt-3 flex flex-col gap-3 shrink-0">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Artboard Style</span>
            
            {/* Background type tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[9px] font-bold text-center">
              <button
                onClick={() => setBgType('transparent')}
                className={`flex-1 py-1 rounded transition-colors ${bgType === 'transparent' ? 'bg-yellow-500 text-zinc-950 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'}`}
              >
                Invisible
              </button>
              <button
                onClick={() => setBgType('solid')}
                className={`flex-1 py-1 rounded transition-colors ${bgType === 'solid' ? 'bg-yellow-500 text-zinc-950 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'}`}
              >
                Solid
              </button>
              <button
                onClick={() => setBgType('gradient')}
                className={`flex-1 py-1 rounded transition-colors ${bgType === 'gradient' ? 'bg-yellow-500 text-zinc-950 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'}`}
              >
                Gradient
              </button>
            </div>

            {bgType === 'solid' && (
              <StudioColorPicker
                label="Solid Color"
                value={solidBg}
                onChange={setSolidBg}
              />
            )}

            {bgType === 'gradient' && (
              <div className="grid grid-cols-5 gap-1.5 bg-zinc-50 dark:bg-zinc-900 p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-16 overflow-y-auto">
                {GRADIENTS.slice(1).map((grad, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedGradient(grad)}
                    className={`h-5 rounded border transition-all cursor-pointer ${selectedGradient.name === grad.name ? 'border-yellow-500 scale-105' : 'border-transparent'} ${grad.preview}`}
                    title={grad.name}
                  />
                ))}
              </div>
            )}

            {/* Radius and Export Dimensions */}
            <div className="space-y-3">
              <StudioSlider
                label="Corners"
                valueDisplay={`${borderRadius}%`}
                min={0}
                max={100}
                step={1}
                value={borderRadius}
                onChange={(val) => setBorderRadius(Math.round(val))}
                onReset={() => setBorderRadius(25)}
              />

              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">Export Size</span>
                <div className="grid grid-cols-4 gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  {[128, 256, 512, 1024].map((sizeOption) => {
                    const isActive = exportSize === sizeOption;
                    return (
                      <button
                        key={sizeOption}
                        type="button"
                        onClick={() => setExportSize(sizeOption)}
                        className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-yellow-500 text-zinc-950 shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        {sizeOption}px
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Shadow Controls */}
            <div className="space-y-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">Drop Shadow</span>
                <button
                  type="button"
                  onClick={() => setShadowEnabled(prev => !prev)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    shadowEnabled 
                      ? 'bg-yellow-500 text-zinc-950' 
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {shadowEnabled ? 'On' : 'Off'}
                </button>
              </div>
              {shadowEnabled && (
                <div className="space-y-2.5 pt-1">
                  <StudioSlider
                    label="Blur"
                    valueDisplay={`${shadowBlur}px`}
                    min={0}
                    max={50}
                    step={1}
                    value={shadowBlur}
                    onChange={(val) => setShadowBlur(Math.round(val))}
                    onReset={() => setShadowBlur(15)}
                  />
                  <div>
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                      <span>Intensity</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShadowColor('rgba(0, 0, 0, 0.45)')}
                        className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                          shadowColor === 'rgba(0, 0, 0, 0.45)' 
                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' 
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                      >
                        Soft
                      </button>
                      <button
                        type="button"
                        onClick={() => setShadowColor('rgba(0, 0, 0, 0.85)')}
                        className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                          shadowColor === 'rgba(0, 0, 0, 0.85)' 
                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' 
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                      >
                        Deep
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ZIP download and Cloud Link generator */}
            <div className="border-t border-zinc-200 dark:border-zinc-900 pt-3 flex flex-col gap-2 text-[10px]">
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all border border-zinc-700 pointer-events-auto"
              >
                {isZipping ? 'Creating ZIP...' : 'Download all Styles ZIP'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUploadImage('imgbb')}
                  disabled={isUploading !== ''}
                  className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 transition-all pointer-events-auto"
                >
                  {isUploading === 'imgbb' ? 'ImgBB...' : 'Link via ImgBB'}
                </button>
                <button
                  onClick={() => handleUploadImage('imgur')}
                  disabled={isUploading !== ''}
                  className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 transition-all pointer-events-auto"
                >
                  {isUploading === 'imgur' ? 'Imgur...' : 'Link via Imgur'}
                </button>
              </div>

              {uploadResultUrl && (
                <div className="bg-zinc-100/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-2 flex flex-col gap-1.5 pointer-events-auto">
                  <span className="text-[7.5px] text-zinc-500 font-bold tracking-wider uppercase">Direct Link Result</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={uploadResultUrl}
                      className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-[9px] font-mono text-yellow-600 dark:text-yellow-400 select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(uploadResultUrl);
                        showToast('Link copied!');
                      }}
                      className="px-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar Ad space */}
          <div className="bg-zinc-100/50 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl h-20 flex items-center justify-center text-center p-2 mt-auto shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 dark:text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-1">
                <Megaphone className="w-3 h-3" /> Google AdSense
              </span>
              <span className="text-[7.5px] text-zinc-400 dark:text-zinc-500">Reserved monetization space</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 5. Floating instructions overlay */}
      <footer className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/80 dark:bg-zinc-950/85 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 shadow-xl backdrop-blur text-[9px] text-zinc-600 dark:text-zinc-400 text-center flex items-center gap-2 select-none pointer-events-none max-w-[95%]">
        <Move className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
        <span>Drag corners to resize • Drag stem to rotate • Right-click for Context Menu • Space+Drag to Pan • Ctrl+Scroll to Zoom</span>
      </footer>

      {/* 6. Settings Credentials Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-zoom-in pointer-events-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSettingsOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            
            <h2 className="text-lg font-black text-zinc-800 dark:text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
              <Settings className="w-5 h-5 text-yellow-500" />
              API Settings
            </h2>
            
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="bg-zinc-100 dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <h3 className="text-xs font-bold text-zinc-500 flex items-center gap-1 uppercase tracking-wider mb-1">
                  <Info className="w-3.5 h-3.5" /> Direct URLs Integration
                </h3>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Upload your customized stickers to cloud hosting (ImgBB or Imgur) to generate public URLs. Useful for Slack/Discord custom bot icons or Google Developer Console inputs.
                </p>
              </div>

              <div>
                <label htmlFor="settings-imgbb-key" className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">ImgBB API Key</label>
                <div className="relative">
                  <input
                    id="settings-imgbb-key"
                    type={showImgbbKey ? 'text' : 'password'}
                    value={apiKeys.imgbb}
                    onChange={(e) => setApiKeys({ ...apiKeys, imgbb: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-yellow-500 focus:outline-none pl-4 pr-10 py-2.5 text-zinc-800 dark:text-white text-xs"
                    placeholder="Enter ImgBB API key..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowImgbbKey(prev => !prev)}
                    aria-label={showImgbbKey ? 'Hide ImgBB API Key' : 'Show ImgBB API Key'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showImgbbKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="settings-imgur-id" className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Imgur Client ID</label>
                <div className="relative">
                  <input
                    id="settings-imgur-id"
                    type={showImgurId ? 'text' : 'password'}
                    value={apiKeys.imgur}
                    onChange={(e) => setApiKeys({ ...apiKeys, imgur: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-yellow-500 focus:outline-none pl-4 pr-10 py-2.5 text-zinc-800 dark:text-white text-xs"
                    placeholder="Enter Imgur Client ID..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowImgurId(prev => !prev)}
                    aria-label={showImgurId ? 'Hide Imgur Client ID' : 'Show Imgur Client ID'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showImgurId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Upload History List */}
              {uploadHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Recent Uploads ({uploadHistory.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-[10px] text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                      title="Clear Upload History"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear History</span>
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    {uploadHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{item.emoji}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] text-zinc-400 font-mono">{item.host} • {item.date}</span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-yellow-600 dark:text-yellow-400 hover:underline truncate max-w-[180px] flex items-center gap-0.5"
                            >
                              <span>{item.url}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.url);
                            showToast('Link copied!');
                          }}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 shrink-0"
                          title="Copy URL"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-transparent text-zinc-500 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Floating Custom HTML Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 text-xs flex flex-col transition-colors duration-200 text-zinc-700 dark:text-zinc-300 pointer-events-auto"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.layerId ? (
            <>
              <button 
                onClick={() => { if (contextMenu.layerId) moveLayerUp(contextMenu.layerId); setContextMenu(prev => ({ ...prev, visible: false })); }} 
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2"
              >
                <ArrowUp className="w-3.5 h-3.5 text-yellow-500" /> Bring Forward
              </button>
              <button 
                onClick={() => { if (contextMenu.layerId) moveLayerDown(contextMenu.layerId); setContextMenu(prev => ({ ...prev, visible: false })); }} 
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2"
              >
                <ArrowDown className="w-3.5 h-3.5 text-yellow-500" /> Send Backward
              </button>
              <button 
                onClick={() => { if (contextMenu.layerId) duplicateLayer(contextMenu.layerId); setContextMenu(prev => ({ ...prev, visible: false })); }} 
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-yellow-500" /> Duplicate Layer
              </button>
              <button 
                onClick={() => { if (contextMenu.layerId) handleCopyLayer(contextMenu.layerId); setContextMenu(prev => ({ ...prev, visible: false })); }} 
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2"
              >
                <Scissors className="w-3.5 h-3.5 text-yellow-500" /> Copy Layer Settings
              </button>
              <button 
                onClick={() => { if (contextMenu.layerId) deleteLayer(contextMenu.layerId); setContextMenu(prev => ({ ...prev, visible: false })); }} 
                className="w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-950/10 hover:text-red-400 border-t border-zinc-200 dark:border-zinc-900 mt-1 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Layer
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { handlePasteLayer(); setContextMenu(prev => ({ ...prev, visible: false })); }} 
                disabled={!copiedLayerData} 
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5 text-yellow-500" /> Paste Layer
              </button>
              <button 
                onClick={() => { setPanX(0); setPanY(0); setCanvasZoom(0.85); setContextMenu(prev => ({ ...prev, visible: false })); }} 
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white border-t border-zinc-200 dark:border-zinc-900 mt-1 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-yellow-500" /> Reset Viewport
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating Success Toast */}
      {successMessage && (
        <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-500 text-zinc-950 font-bold px-4 py-2 rounded-full shadow-2xl animate-fade-in flex items-center gap-1.5 text-xs pointer-events-auto">
          <Check className="w-4 h-4 text-zinc-950" />
          {successMessage}
        </div>
      )}
    </div>
  );
}
