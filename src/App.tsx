"use client";
import React, { useState, useEffect, useRef, useTransition, useMemo } from 'react';
import Link from 'next/link';
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
  X,
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
  EyeOff,
  Search,
  ChevronRight,
  CopyPlus,
} from 'lucide-react';
import JSZip from 'jszip';
import { StudioSelect, StudioSlider, StudioColorPicker } from './components/StudioControls';
import { SmoljiMark } from './components/SmoljiMark';
import {
  EMOJI_STYLES,
  GRADIENTS,
  POPULAR_EMOJIS,
  getEmojiUrl,
  parseEmojis,
  uploadToImgBB,
  uploadToImgur,
  getGemojiList,
} from './utils/emoji';
import {
  ColorScheme,
  THEME_EVENT_NAME,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  getStoredThemeOverride,
  resolveTheme,
  toggleThemePreference,
} from './utils/theme';

const ALL_POPULAR_EMOJIS = Object.values(POPULAR_EMOJIS).flat();

const CATEGORY_TABS: Array<{ id: string; label: string; key: keyof typeof POPULAR_EMOJIS | null }> = [
  { id: 'all', label: 'All', key: null },
  { id: 'faces', label: 'Faces', key: 'Faces & Expressions' },
  { id: 'hands', label: 'Hands', key: 'Gestures & Hands' },
  { id: 'hearts', label: 'Symbols', key: 'Hearts & Symbols' },
  { id: 'nature', label: 'Nature', key: 'Animals & Nature' },
  { id: 'tech', label: 'Objects', key: 'Objects & Technology' },
  { id: 'sports', label: 'Sports', key: 'Activities & Sports' },
  { id: 'food', label: 'Food', key: 'Food & Drink' },
];

const SHORTCODE_MAP = new Map<string, string>();
for (const item of getGemojiList()) {
  for (const name of item.names) {
    SHORTCODE_MAP.set(name.toLowerCase(), item.emoji);
    SHORTCODE_MAP.set(name.toLowerCase().replace(/_/g, '-'), item.emoji);
  }
}

export default function App() {
  const [, startTransition] = useTransition();

  // Theme state synced cleanly with localStorage, OS prefers-color-scheme, and meta color-scheme
  const [theme, setTheme] = useState<ColorScheme>(() => resolveTheme());

  // Input & Library filter states
  const [inputText, setInputText] = useState('🚀');
  const [detectedEmojis, setDetectedEmojis] = useState<string[]>(['🚀']);
  const [selectedStyle, setSelectedStyle] = useState('microsoft-3D-fluent');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [catalogQuery, setCatalogQuery] = useState('');

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
      opacity: 1.0,
      visible: true,
    },
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    layerId: null,
  });

  // Clipboard state for layers
  const [copiedLayerData, setCopiedLayerData] = useState<Layer | null>(null);

  // Viewport and UI Panels States
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const [bgType, setBgType] = useState<string>('gradient');
  const [solidBg, setSolidBg] = useState('#1C1917');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[1]);
  const [borderRadius, setBorderRadius] = useState(25);
  const [exportSize, setExportSize] = useState(512);

  // Shadow states
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowColor, setShadowColor] = useState('rgba(0, 0, 0, 0.45)');
  const [shadowBlur, setShadowBlur] = useState(15);
  const [shadowOffsetX] = useState(0);
  const [shadowOffsetY] = useState(8);

  // Settings & Upload states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState({ imgbb: '', imgur: '' });
  const [showImgbbKey, setShowImgbbKey] = useState(false);
  const [showImgurId, setShowImgurId] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadedHistory[]>([]);
  const [isUploading, setIsUploading] = useState<string>('');
  const [uploadResultUrl, setUploadResultUrl] = useState('');

  // UI Status states
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isZipping, setIsZipping] = useState(false);
  const [, setCanvasError] = useState('');

  // Interactive interactionMode: null | 'drag' | 'rotate' | 'scale_tl' | 'scale_tr' | 'scale_bl' | 'scale_br'
  const [interactionMode, setInteractionMode] = useState<string | null>(null);

  // Refs
  const dragStart = useRef({
    mouseX: 0,
    mouseY: 0,
    layerX: 0,
    layerY: 0,
    layerScale: 1.0,
    layerRotation: 0,
  });
  const panStart = useRef({ x: 0, y: 0 });
  const touchStartDist = useRef(0);
  const touchStartZoom = useRef(1);
  const touchStartLayerScale = useRef(1);
  const imageCache = useRef<Record<string, HTMLImageElement | 'loading' | 'failed'>>({});
  const redrawPending = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const settingsDialogRef = useRef<HTMLDialogElement | null>(null);

  // Filtered library emojis from keyword search or active category
  const displayedLibraryEmojis = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase().replace(/^:|:$/g, '');
    if (query.length >= 1) {
      return getGemojiList()
        .filter(
          (item) =>
            item.names.some((n) => n.toLowerCase().includes(query)) ||
            item.tags.some((t) => t.toLowerCase().includes(query)) ||
            item.description.toLowerCase().includes(query)
        )
        .slice(0, 72)
        .map((item) => item.emoji);
    }
    const category = CATEGORY_TABS.find((c) => c.id === activeCategory);
    if (category && category.key) {
      return POPULAR_EMOJIS[category.key];
    }
    return ALL_POPULAR_EMOJIS;
  }, [activeCategory, catalogQuery]);

  const pushStateToUndo = (currentLayers: Layer[]) => {
    setUndoStack((prev) => [...prev.slice(-25), currentLayers]);
    setRedoStack([]);
  };

  const showToast = (message: string) => {
    setSuccessMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setSuccessMessage('');
      toastTimerRef.current = null;
    }, 3000);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, layers]);
    setLayers(previous);
    if (!previous.some((l) => l.id === selectedLayerId)) {
      setSelectedLayerId(previous[previous.length - 1]?.id || null);
    }
    showToast('Undo');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, layers]);
    setLayers(next);
    if (!next.some((l) => l.id === selectedLayerId)) {
      setSelectedLayerId(next[next.length - 1]?.id || null);
    }
    showToast('Redo');
  };

  // Sync theme on mount and react to cross-tab / OS changes without erasing explicit override
  useEffect(() => {
    applyThemeToDocument(theme, getStoredThemeOverride());
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        const next = resolveTheme();
        applyThemeToDocument(next, getStoredThemeOverride());
        setTheme(next);
      }
    };

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<ColorScheme>).detail;
      if (detail === 'light' || detail === 'dark') {
        setTheme(detail);
      }
    };

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    const handleMediaChange = () => {
      if (!getStoredThemeOverride()) {
        const next = resolveTheme();
        applyThemeToDocument(next, null);
        setTheme(next);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(THEME_EVENT_NAME, handleCustomEvent);
    mediaQuery?.addEventListener('change', handleMediaChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(THEME_EVENT_NAME, handleCustomEvent);
      mediaQuery?.removeEventListener('change', handleMediaChange);
    };
  }, []);

  // Sync native <dialog> top-layer modal state with jsdom-safe fallback
  useEffect(() => {
    const dialog = settingsDialogRef.current;
    if (!dialog) return;

    if (settingsOpen) {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        dialog.setAttribute('open', '');
      }
    } else {
      if (typeof dialog.close === 'function') {
        if (dialog.open) {
          dialog.close();
        }
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [settingsOpen]);

  // Global listeners for spacebar pan trigger
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (e.code === 'Space' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && !settingsOpen) {
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
  }, [settingsOpen]);

  // Global Context Menu hiding listener
  useEffect(() => {
    const closeMenu = () => setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    const closeMenuOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };
    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeMenuOnEsc);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeMenuOnEsc);
    };
  }, []);

  // Load saved keys & upload history from localStorage on mount
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

  // Canvas keyboard shortcuts
  useEffect(() => {
    const handleKeyDownShortcuts = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return;
      }

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

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLayerId) {
          e.preventDefault();
          deleteLayer(selectedLayerId);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedLayerId) {
          e.preventDefault();
          duplicateLayer(selectedLayerId);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedLayerId) {
          e.preventDefault();
          handleCopyLayer(selectedLayerId);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedLayerData) {
          e.preventDefault();
          handlePasteLayer();
        }
      }

      if (e.key.startsWith('Arrow') && selectedLayerId) {
        e.preventDefault();
        const speed = e.shiftKey ? 10 : 1;
        setLayers((prev) =>
          prev.map((l) => {
            if (l.id === selectedLayerId) {
              let dx = 0;
              let dy = 0;
              if (e.key === 'ArrowUp') dy = -speed;
              if (e.key === 'ArrowDown') dy = speed;
              if (e.key === 'ArrowLeft') dx = -speed;
              if (e.key === 'ArrowRight') dx = speed;
              return { ...l, x: l.x + dx, y: l.y + dy };
            }
            return l;
          })
        );
      }
    };

    window.addEventListener('keydown', handleKeyDownShortcuts);
    return () => window.removeEventListener('keydown', handleKeyDownShortcuts);
  });

  // Wheel zooming listener (non-passive to permit preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = 1.08;
        if (e.deltaY < 0) {
          setCanvasZoom((prev) => Math.min(prev * zoomFactor, 6.0));
        } else {
          setCanvasZoom((prev) => Math.max(prev / zoomFactor, 0.25));
        }
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Viewport resize listener
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw interactive canvas whenever state changes
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
    viewportSize,
  ]);

  const handleCopyLayer = (id: string) => {
    const layer = layers.find((l) => l.id === id);
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
      flipY: layer.flipY,
      visible: layer.visible,
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
      y: (Math.random() - 0.5) * 40,
    };
    setLayers((prev) => [...prev, newLayer]);
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

  const getTransformPoints = (layer: Layer, size = 512) => {
    const cx = size / 2 + layer.x;
    const cy = size / 2 + layer.y;
    const es = 256 * layer.scale;

    const pts = {
      tl: { x: -es / 2, y: -es / 2 },
      tr: { x: es / 2, y: -es / 2 },
      bl: { x: -es / 2, y: es / 2 },
      br: { x: es / 2, y: es / 2 },
      rot: { x: 0, y: -es / 2 - 28 },
    };

    const rotRad = ((layer.rotation || 0) * Math.PI) / 180;
    const skewXRad = ((layer.skewX || 0) * Math.PI) / 180;
    const skewYRad = ((layer.skewY || 0) * Math.PI) / 180;

    const transformed: Record<string, { x: number; y: number }> = {};
    for (const [key, pt] of Object.entries(pts)) {
      let px = pt.x;
      let py = pt.y;

      if (layer.flipX) px = -px;
      if (layer.flipY) py = -py;

      const sx = px + py * Math.tan(skewXRad);
      const sy = px * Math.tan(skewYRad) + py;

      const rx = sx * Math.cos(rotRad) - sy * Math.sin(rotRad);
      const ry = sx * Math.sin(rotRad) + sy * Math.cos(rotRad);

      transformed[key] = { x: cx + rx, y: cy + ry };
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

  const drawEditorCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = viewportSize.width;
    const height = viewportSize.height;

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

  const render2D = (
    ctx: CanvasRenderingContext2D,
    widthOrSize: number,
    heightOrNull: number | null,
    isExport?: boolean
  ) => {
    if (isExport) {
      const size = widthOrSize;
      const scaleFactor = size / 512;

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
          ctx.fillStyle = colors[0] || '#C23E1A';
        }
        ctx.fillRect(0, 0, size, size);
      }
      ctx.restore();

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
          const sx = ((layer.skewX || 0) * Math.PI) / 180;
          const sy = ((layer.skewY || 0) * Math.PI) / 180;
          ctx.transform(1, Math.tan(sy), Math.tan(sx), 1, 0, 0);
        }

        ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
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
          ctx.fillStyle = theme === 'dark' ? '#F4EFE6' : '#1B1917';
          ctx.font = `${emojiSize * 0.7}px system-ui, Segoe UI`;
          ctx.fillText(layer.emoji || '', 0, 0);
        }
        ctx.restore();
      });
      return;
    }

    const width = widthOrSize;
    const height = heightOrNull ?? 800;

    // 1. Warm cutting mat (dark) or drafting desk paper (light)
    ctx.fillStyle = theme === 'dark' ? '#161513' : '#EDE7DC';
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle registration dot matrix
    ctx.save();
    const gridSize = 32 * canvasZoom;
    const startX = (width / 2 + panX) % gridSize;
    const startY = (height / 2 + panY) % gridSize;
    ctx.fillStyle = theme === 'dark' ? 'rgba(244, 239, 230, 0.08)' : 'rgba(27, 25, 23, 0.09)';
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
    ctx.translate(-256, -256);

    // 4. Artboard clip + fill
    ctx.save();
    const rad = (borderRadius / 100) * 256;
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 512, rad);
    ctx.closePath();
    ctx.clip();

    if (bgType === 'transparent') {
      ctx.fillStyle = theme === 'dark' ? '#211F1C' : '#E2DBD0';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = theme === 'dark' ? '#2B2824' : '#FDFBF7';
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
        ctx.fillStyle = colors[0] || '#C23E1A';
      }
      ctx.fillRect(0, 0, 512, 512);
    }
    ctx.restore();

    // Artboard hairline frame
    ctx.strokeStyle = theme === 'dark' ? 'rgba(244, 239, 230, 0.16)' : 'rgba(27, 25, 23, 0.16)';
    ctx.lineWidth = Math.max(1.5, 2 / canvasZoom);
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 512, rad);
    ctx.stroke();

    // 5. Render visible layers
    layers.forEach((layer) => {
      if (layer.visible === false) return;
      const imgUrl = getEmojiUrl(layer.emoji || '', layer.style || selectedStyle);
      let img = imageCache.current[imgUrl];

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
        const sx = ((layer.skewX || 0) * Math.PI) / 180;
        const sy = ((layer.skewY || 0) * Math.PI) / 180;
        ctx.transform(1, Math.tan(sy), Math.tan(sx), 1, 0, 0);
      }

      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
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
        ctx.fillStyle = theme === 'dark' ? '#F4EFE6' : '#1B1917';
        ctx.font = `${emojiSize * 0.7}px system-ui, Segoe UI`;
        ctx.fillText(layer.emoji || '', 0, 0);
      }
      ctx.restore();

      // 6. Vermilion selection frame & transform handles (never included when isExport is true)
      if (layer.id === selectedLayerId) {
        const accentColor = theme === 'dark' ? '#F06A43' : '#C23E1A';
        ctx.save();
        ctx.translate(cx, cy);
        if (layer.skewX || layer.skewY) {
          const sx = ((layer.skewX || 0) * Math.PI) / 180;
          const sy = ((layer.skewY || 0) * Math.PI) / 180;
          ctx.transform(1, Math.tan(sy), Math.tan(sx), 1, 0, 0);
        }
        ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = Math.max(1.5, 2.2 / canvasZoom);
        ctx.setLineDash([4 / canvasZoom, 4 / canvasZoom]);
        const es = 256 * layer.scale;
        ctx.strokeRect(-es / 2 - 2, -es / 2 - 2, es + 4, es + 4);

        ctx.fillStyle = accentColor;
        ctx.strokeStyle = theme === 'dark' ? '#161513' : '#FDFBF7';
        ctx.lineWidth = Math.max(1.2, 1.8 / canvasZoom);
        ctx.setLineDash([]);

        const hs = Math.max(8, 10 / canvasZoom);
        const drawHandle = (hx: number, hy: number) => {
          ctx.beginPath();
          ctx.arc(hx, hy, hs / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        };

        drawHandle(-es / 2 - 2, -es / 2 - 2);
        drawHandle(es / 2 + 2, -es / 2 - 2);
        drawHandle(-es / 2 - 2, es / 2 + 2);
        drawHandle(es / 2 + 2, es / 2 + 2);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = Math.max(1.2, 1.5 / canvasZoom);
        ctx.beginPath();
        ctx.moveTo(0, -es / 2 - 2);
        ctx.lineTo(0, -es / 2 - 28);
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.strokeStyle = theme === 'dark' ? '#161513' : '#FDFBF7';
        drawHandle(0, -es / 2 - 28);
        ctx.restore();
      }
    });

    ctx.restore();
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
      opacity: 1.0,
      visible: true,
    };
    setLayers((prev) => [...prev, newLayer]);
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
      opacity: 1.0,
      visible: true,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    showToast(`Added layer in ${EMOJI_STYLES.find((s) => s.id === styleId)?.name || styleId} style.`);
  };

  const getLayerAtPosition = (artX: number, artY: number) => {
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.visible === false) continue;
      const lx = 512 / 2 + layer.x;
      const ly = 512 / 2 + layer.y;
      const es = 256 * layer.scale;

      if (artX >= lx - es / 2 && artX <= lx + es / 2 && artY >= ly - es / 2 && artY <= ly + es / 2) {
        return layer.id;
      }
    }
    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
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

    const activeLayer = layers.find((l) => l.id === selectedLayerId);
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
          layerRotation: activeLayer.rotation,
        };
        return;
      }
    }

    const clickedId = getLayerAtPosition(artX, artY);
    if (clickedId) {
      setSelectedLayerId(clickedId);
      setInteractionMode('drag');
      const layer = layers.find((l) => l.id === clickedId);
      if (layer) {
        dragStart.current = {
          mouseX: artX,
          mouseY: artY,
          layerX: layer.x,
          layerY: layer.y,
          layerScale: layer.scale,
          layerRotation: layer.rotation,
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
      setPanX((prev) => prev + dx);
      setPanY((prev) => prev + dy);
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

    const activeLayer = layers.find((l) => l.id === selectedLayerId);

    if (interactionMode === 'drag' && activeLayer) {
      const dx = artX - dragStart.current.mouseX;
      const dy = artY - dragStart.current.mouseY;
      setLayers((prev) =>
        prev.map((l) =>
          l.id === selectedLayerId
            ? { ...l, x: dragStart.current.layerX + dx, y: dragStart.current.layerY + dy }
            : l
        )
      );
    } else if (interactionMode === 'rotate' && activeLayer) {
      const layerCx = 512 / 2 + activeLayer.x;
      const layerCy = 512 / 2 + activeLayer.y;

      const angleCurrent = Math.atan2(artY - layerCy, artX - layerCx);
      const angleStart = Math.atan2(dragStart.current.mouseY - layerCy, dragStart.current.mouseX - layerCx);
      const angleDiff = ((angleCurrent - angleStart) * 180) / Math.PI;

      setLayers((prev) =>
        prev.map((l) =>
          l.id === selectedLayerId ? { ...l, rotation: (dragStart.current.layerRotation + angleDiff) % 360 } : l
        )
      );
    } else if (interactionMode && interactionMode.startsWith('scale_') && activeLayer) {
      const layerCx = 512 / 2 + activeLayer.x;
      const layerCy = 512 / 2 + activeLayer.y;

      const distCurrent = Math.hypot(artX - layerCx, artY - layerCy);
      const distStart = Math.hypot(dragStart.current.mouseX - layerCx, dragStart.current.mouseY - layerCy);
      const scaleRatio = distStart > 0 ? distCurrent / distStart : 1;

      setLayers((prev) =>
        prev.map((l) =>
          l.id === selectedLayerId
            ? { ...l, scale: Math.max(0.1, Math.min(dragStart.current.layerScale * scaleRatio, 4.0)) }
            : l
        )
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setInteractionMode(null);
    setIsPanning(false);
  };

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

    const clampedX = Math.min(e.clientX, Math.max(12, viewportSize.width - 200));
    const clampedY = Math.min(e.clientY, Math.max(12, viewportSize.height - 200));

    setContextMenu({
      visible: true,
      x: clampedX,
      y: clampedY,
      layerId: clickedId,
    });
  };

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

      const activeLayer = layers.find((l) => l.id === selectedLayerId);
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
            layerRotation: activeLayer.rotation,
          };
          return;
        }
      }

      const clickedId = getLayerAtPosition(artX, artY);
      if (clickedId) {
        setSelectedLayerId(clickedId);
        setInteractionMode('drag');
        const layer = layers.find((l) => l.id === clickedId);
        if (layer) {
          dragStart.current = {
            mouseX: artX,
            mouseY: artY,
            layerX: layer.x,
            layerY: layer.y,
            layerScale: layer.scale,
            layerRotation: layer.rotation,
          };
        }
      } else {
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
        const active = layers.find((l) => l.id === selectedLayerId);
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
        setPanX((prev) => prev + dx);
        setPanY((prev) => prev + dy);
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

        const activeLayer = layers.find((l) => l.id === selectedLayerId);
        if (!activeLayer) return;

        if (interactionMode === 'drag') {
          const dx = artX - dragStart.current.mouseX;
          const dy = artY - dragStart.current.mouseY;
          setLayers((prev) =>
            prev.map((l) =>
              l.id === selectedLayerId
                ? { ...l, x: dragStart.current.layerX + dx, y: dragStart.current.layerY + dy }
                : l
            )
          );
        } else if (interactionMode === 'rotate') {
          const layerCx = 512 / 2 + activeLayer.x;
          const layerCy = 512 / 2 + activeLayer.y;
          const angleCurrent = Math.atan2(artY - layerCy, artX - layerCx);
          const angleStart = Math.atan2(dragStart.current.mouseY - layerCy, dragStart.current.mouseX - layerCx);
          const angleDiff = ((angleCurrent - angleStart) * 180) / Math.PI;
          setLayers((prev) =>
            prev.map((l) =>
              l.id === selectedLayerId ? { ...l, rotation: (dragStart.current.layerRotation + angleDiff) % 360 } : l
            )
          );
        } else if (interactionMode.startsWith('scale_')) {
          const layerCx = 512 / 2 + activeLayer.x;
          const layerCy = 512 / 2 + activeLayer.y;
          const distCurrent = Math.hypot(artX - layerCx, artY - layerCy);
          const distStart = Math.hypot(dragStart.current.mouseX - layerCx, dragStart.current.mouseY - layerCy);
          const scaleRatio = distStart > 0 ? distCurrent / distStart : 1;
          setLayers((prev) =>
            prev.map((l) =>
              l.id === selectedLayerId
                ? { ...l, scale: Math.max(0.1, Math.min(dragStart.current.layerScale * scaleRatio, 4.0)) }
                : l
            )
          );
        }
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (touchStartDist.current > 0) {
        const factor = dist / touchStartDist.current;
        if (selectedLayerId) {
          setLayers((prev) =>
            prev.map((l) =>
              l.id === selectedLayerId
                ? { ...l, scale: Math.max(0.15, Math.min(touchStartLayerScale.current * factor, 3.5)) }
                : l
            )
          );
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
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1 || idx === layers.length - 1) return;
    pushStateToUndo(layers);
    const newLayers = [...layers];
    const temp = newLayers[idx];
    newLayers[idx] = newLayers[idx + 1];
    newLayers[idx + 1] = temp;
    setLayers(newLayers);
  };

  const moveLayerDown = (id: string) => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1 || idx === 0) return;
    pushStateToUndo(layers);
    const newLayers = [...layers];
    const temp = newLayers[idx];
    newLayers[idx] = newLayers[idx - 1];
    newLayers[idx - 1] = temp;
    setLayers(newLayers);
  };

  const toggleLayerVisibility = (id: string) => {
    pushStateToUndo(layers);
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: l.visible === false } : l))
    );
  };

  const duplicateLayer = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    pushStateToUndo(layers);
    const newLayer: Layer = {
      ...layer,
      id: Date.now().toString(),
      x: layer.x + 20,
      y: layer.y + 20,
    };
    const idx = layers.findIndex((l) => l.id === id);
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
    const newLayers = layers.filter((l) => l.id !== id);
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
      url,
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
    const folder = zip.folder('smolji_pack');

    showToast('Compiling ZIP for all emoji styles...');

    for (const style of EMOJI_STYLES) {
      const styleCanvas = document.createElement('canvas');
      styleCanvas.width = exportSize;
      styleCanvas.height = exportSize;
      const sCtx = styleCanvas.getContext('2d');
      if (!sCtx) continue;
      const size = exportSize;
      const scaleFactor = size / 512;

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
          sCtx.fillStyle = colors[0] || '#C23E1A';
        }
        sCtx.fillRect(0, 0, size, size);
      }
      sCtx.restore();

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
          const sx = ((layer.skewX || 0) * Math.PI) / 180;
          const sy = ((layer.skewY || 0) * Math.PI) / 180;
          sCtx.transform(1, Math.tan(sy), Math.tan(sx), 1, 0, 0);
        }

        sCtx.rotate(((layer.rotation || 0) * Math.PI) / 180);
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
          sCtx.fillStyle = '#FFFFFF';
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
      link.download = 'smolji_sticker_pack.zip';
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast('ZIP folder downloaded!');
    } catch {
      showToast('Error building ZIP package.');
    } finally {
      setIsZipping(false);
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
          endIndex: selectionEnd,
        };
      }
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;

    const replaced = val.replace(/:([a-zA-Z0-9_\-+]+):/g, (match, name) => {
      const found = SHORTCODE_MAP.get(name.toLowerCase());
      return found || match;
    });

    setInputText(replaced);

    const caret = getCaretInfo(e.target, replaced);
    if (caret && caret.query.length >= 1) {
      startTransition(() => {
        const list = getGemojiList();
        const query = caret.query.toLowerCase();

        const filtered = list
          .filter(
            (item) =>
              item.names.some((name) => name.includes(query)) ||
              item.tags.some((tag) => tag.includes(query)) ||
              item.description.toLowerCase().includes(query)
          )
          .slice(0, 5);

        setSuggestions(filtered);
        setCaretInfo(caret);
        setSuggestionIndex(0);
      });
    } else {
      setSuggestions([]);
      setCaretInfo(null);
    }
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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
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
      }
    }
  };

  const activeLayer = layers.find((l) => l.id === selectedLayerId);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#EDE7DC] dark:bg-[#161513] text-[#1B1917] dark:text-[#F4EFE6] flex flex-col font-sans select-none">
      {/* 1. Interactive Canvas Stage */}
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
        className="absolute inset-0 w-full h-full block touch-none"
        style={{
          cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : interactionMode ? 'grabbing' : 'default',
        }}
      />

      {/* 2. Top Workbench Toolbar */}
      <header className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Brand home link */}
        <Link
          href="/"
          title="Back to Smolji overview"
          className="flex items-center gap-2.5 bg-[#FDFBF7]/95 dark:bg-[#1F1D1A]/95 border border-[#C7BEB1] dark:border-[#49433B] px-3.5 py-2 rounded-2xl shadow-sm pointer-events-auto hover:border-[#C23E1A] dark:hover:border-[#F06A43] transition-colors group"
        >
          <SmoljiMark className="w-8 h-8 shrink-0" decorative />
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-base font-extrabold tracking-tight text-[#1B1917] dark:text-[#F4EFE6] leading-none">
              Smolji
            </h1>
            <span className="hidden sm:inline-block text-[0.6875rem] font-mono font-medium px-1.5 py-0.5 rounded bg-[#EDE7DC] dark:bg-[#292622] text-[#5B534B] dark:text-[#B8AFA4] group-hover:text-[#B93815] dark:group-hover:text-[#F06A43] transition-colors">
              Studio
            </span>
          </div>
        </Link>

        {/* Center Undo/Redo + Zoom cluster */}
        <div className="flex items-center gap-1 bg-[#FDFBF7]/95 dark:bg-[#1F1D1A]/95 border border-[#C7BEB1] dark:border-[#49433B] p-1 rounded-2xl shadow-sm pointer-events-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="min-w-8 min-h-8 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-xl text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] disabled:opacity-35 cursor-pointer transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4 mx-auto" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="min-w-8 min-h-8 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-xl text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] disabled:opacity-35 cursor-pointer transition-colors"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4 mx-auto" aria-hidden="true" />
          </button>
          <span className="w-px h-4 bg-[#D8D0C3] dark:bg-[#3A352F] mx-0.5" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setCanvasZoom((prev) => Math.max(prev - 0.15, 0.25))}
            className="min-w-8 min-h-8 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-xl text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] cursor-pointer transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4 mx-auto" aria-hidden="true" />
          </button>
          <span className="text-xs font-mono font-semibold text-[#1B1917] dark:text-[#F4EFE6] px-1.5 text-center min-w-12 tabular-nums">
            {Math.round(canvasZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setCanvasZoom((prev) => Math.min(prev + 0.15, 6.0))}
            className="min-w-8 min-h-8 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-xl text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] cursor-pointer transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4 mx-auto" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setPanX(0);
              setPanY(0);
              setCanvasZoom(0.85);
            }}
            className="min-w-8 min-h-8 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-xl text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] border-l border-[#D8D0C3] dark:border-[#3A352F] pl-2 ml-0.5 cursor-pointer transition-colors"
            title="Recenter view"
            aria-label="Recenter view"
          >
            <RefreshCw className="w-4 h-4 mx-auto" aria-hidden="true" />
          </button>
        </div>

        {/* Right actions & drawer toggles */}
        <div className="flex items-center gap-1.5 bg-[#FDFBF7]/95 dark:bg-[#1F1D1A]/95 border border-[#C7BEB1] dark:border-[#49433B] p-1 rounded-2xl shadow-sm pointer-events-auto">
          <button
            type="button"
            onClick={() => setLeftPanelOpen((prev) => !prev)}
            aria-pressed={leftPanelOpen}
            className={`min-h-8 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              leftPanelOpen
                ? 'border-[#C23E1A]/60 dark:border-[#F06A43]/60 bg-[#C23E1A]/10 dark:bg-[#F06A43]/15 text-[#B93815] dark:text-[#F06A43]'
                : 'border-transparent text-[#5B534B] dark:text-[#B8AFA4] hover:bg-[#EDE7DC] dark:hover:bg-[#292622]'
            }`}
            title="Toggle Asset Library Panel"
          >
            <Smile className="w-4 h-4" aria-hidden="true" />
            <span className="hidden lg:inline">Library</span>
          </button>

          <button
            type="button"
            onClick={() => setRightPanelOpen((prev) => !prev)}
            aria-pressed={rightPanelOpen}
            className={`min-h-8 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              rightPanelOpen
                ? 'border-[#C23E1A]/60 dark:border-[#F06A43]/60 bg-[#C23E1A]/10 dark:bg-[#F06A43]/15 text-[#B93815] dark:text-[#F06A43]'
                : 'border-transparent text-[#5B534B] dark:text-[#B8AFA4] hover:bg-[#EDE7DC] dark:hover:bg-[#292622]'
            }`}
            title="Toggle Layer Properties Panel"
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span className="hidden lg:inline">Properties</span>
          </button>

          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="min-w-8 min-h-8 p-2 bg-[#EDE7DC] dark:bg-[#292622] hover:bg-[#E2DBD0] dark:hover:bg-[#35312C] text-[#1B1917] dark:text-[#F4EFE6] rounded-xl text-xs font-semibold transition-colors border border-[#8F8578] dark:border-[#756C61] flex items-center justify-center cursor-pointer"
            title="Copy PNG sticker image to clipboard"
            aria-label="Copy PNG sticker image to clipboard"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            className="min-h-8 px-3.5 py-1.5 bg-[#C23E1A] hover:bg-[#A83314] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Download PNG sticker file"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Save PNG</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(toggleThemePreference(resolveTheme()))}
            className="min-w-8 min-h-8 p-2 rounded-xl border border-[#8F8578] dark:border-[#756C61] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] hover:bg-[#EDE7DC] dark:hover:bg-[#292622] transition-colors cursor-pointer"
            title="Toggle theme"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#F06A43]" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="min-w-8 min-h-8 p-2 rounded-xl border border-[#8F8578] dark:border-[#756C61] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] hover:bg-[#EDE7DC] dark:hover:bg-[#292622] transition-colors cursor-pointer"
            title="Settings"
            aria-label="Open API Settings and Licenses"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* 3. Left Drawer (Studio Assets & Emoji Library) */}
      <aside
        aria-label="Studio Assets"
        className={`absolute top-20 left-3.5 bottom-3.5 z-20 w-76 pointer-events-none transition-transform duration-200 ease-out ${
          leftPanelOpen ? 'translate-x-0' : '-translate-x-96'
        }`}
      >
        <div className="w-full h-full bg-[#FDFBF7]/95 dark:bg-[#1F1D1A]/95 border border-[#C7BEB1] dark:border-[#49433B] rounded-2xl shadow-lg p-4 flex flex-col gap-3.5 overflow-y-auto pointer-events-auto">
          <div className="border-b border-[#D8D0C3] dark:border-[#3A352F] pb-3 flex items-center justify-between gap-2 shrink-0">
            <h2 className="text-xs font-bold tracking-wide uppercase text-[#B93815] dark:text-[#F06A43] flex items-center gap-2 shrink-0">
              <Smile className="w-4 h-4" aria-hidden="true" />
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

          {/* Multi-emoji paste & :shortcode: autocomplete box */}
          <div className="relative shrink-0">
            <label htmlFor="shortcode-input" className="sr-only">
              Paste emojis or type a shortcode
            </label>
            <textarea
              id="shortcode-input"
              ref={textareaRef}
              rows={2}
              className="w-full rounded-xl bg-[#EDE7DC]/60 dark:bg-[#292622]/70 border border-[#8F8578] dark:border-[#756C61] focus:border-[#C23E1A] dark:focus:border-[#F06A43] px-3 py-2 text-[#1B1917] dark:text-[#F4EFE6] placeholder-[#6B6258] dark:placeholder-[#9E958A] transition-colors font-sans resize-y text-xs"
              placeholder="Search emoji by shortcode (e.g. :smile:)..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
            />

            {suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 mt-1.5 w-full bg-[#FDFBF7] dark:bg-[#1F1D1A] border border-[#8F8578] dark:border-[#756C61] rounded-xl shadow-xl p-1 flex flex-col gap-0.5">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion(item)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors text-xs cursor-pointer ${
                      suggestionIndex === idx
                        ? 'bg-[#C23E1A] text-white font-semibold'
                        : 'hover:bg-[#EDE7DC] dark:hover:bg-[#292622] text-[#1B1917] dark:text-[#F4EFE6]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <span
                        className={`font-mono text-[0.6875rem] truncate ${
                          suggestionIndex === idx ? 'text-white' : 'text-[#5B534B] dark:text-[#B8AFA4]'
                        }`}
                      >
                        :{item.names[0]}:
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detected emojis from textarea */}
          {detectedEmojis.length > 0 && (
            <div className="shrink-0">
              <span className="block text-[0.6875rem] font-semibold text-[#5B534B] dark:text-[#B8AFA4] mb-1.5">
                Detected Emojis
              </span>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#EDE7DC]/55 dark:bg-[#292622]/55 border border-[#D8D0C3] dark:border-[#3A352F] rounded-xl max-h-24 overflow-y-auto">
                {detectedEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => addLayer(emoji)}
                    title={`Add ${emoji} layer`}
                    className="text-lg min-w-8 min-h-8 p-1 rounded-lg bg-[#FDFBF7] dark:bg-[#1F1D1A] hover:border-[#C23E1A] dark:hover:border-[#F06A43] border border-[#8F8578] dark:border-[#756C61] text-[#1B1917] dark:text-[#F4EFE6] transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Catalog with category pills & keyword filter */}
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <span className="text-[0.6875rem] font-semibold text-[#5B534B] dark:text-[#B8AFA4]">
                Library Quick Emojis
              </span>
              <span className="text-[0.6875rem] font-mono text-[#5B534B] dark:text-[#B8AFA4]">
                {displayedLibraryEmojis.length}
              </span>
            </div>

            <div role="search" className="shrink-0">
              <label htmlFor="catalog-keyword-filter" className="sr-only">
                Filter emoji catalog by keyword
              </label>
              <div className="relative flex items-center">
                <Search
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-[#5B534B] dark:text-[#B8AFA4] absolute left-2.5 pointer-events-none"
                />
                <input
                  id="catalog-keyword-filter"
                  type="search"
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  placeholder="Filter by keyword (heart, cat...)"
                  className="w-full min-h-8 rounded-lg bg-[#EDE7DC]/60 dark:bg-[#292622]/70 border border-[#8F8578] dark:border-[#756C61] focus:border-[#C23E1A] dark:focus:border-[#F06A43] pl-8 pr-2.5 py-1 text-xs text-[#1B1917] dark:text-[#F4EFE6] placeholder-[#6B6258] dark:placeholder-[#9E958A]"
                />
              </div>
            </div>

            {!catalogQuery.trim() && (
              <div
                className="flex flex-wrap gap-1 shrink-0"
                role="group"
                aria-label="Emoji categories"
              >
                {CATEGORY_TABS.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`min-h-6 px-2 py-1 rounded-lg text-[0.6875rem] font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#C23E1A] text-white'
                          : 'bg-[#EDE7DC] dark:bg-[#292622] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-6 gap-1 p-2 bg-[#EDE7DC]/55 dark:bg-[#292622]/55 border border-[#D8D0C3] dark:border-[#3A352F] rounded-xl overflow-y-auto flex-1 min-h-0">
              {displayedLibraryEmojis.length > 0 ? (
                displayedLibraryEmojis.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={() => addLayer(emoji)}
                    title={`Add ${emoji} layer`}
                    className="text-lg min-h-9 p-1 rounded-lg hover:bg-[#FDFBF7] dark:hover:bg-[#1F1D1A] border border-transparent hover:border-[#8F8578] dark:hover:border-[#756C61] transition-colors flex items-center justify-center cursor-pointer text-[#1B1917] dark:text-[#F4EFE6]"
                  >
                    {emoji}
                  </button>
                ))
              ) : (
                <p className="col-span-6 py-6 text-center text-xs text-[#5B534B] dark:text-[#B8AFA4]">
                  No matching emojis found.
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* 4. Right Inspector (Layers, Properties, Artboard & Export) */}
      <aside
        aria-label="Layers and Artboard Properties"
        className={`absolute top-20 right-3.5 bottom-3.5 z-20 w-80 pointer-events-none transition-transform duration-200 ease-out ${
          rightPanelOpen ? 'translate-x-0' : 'translate-x-96'
        }`}
      >
        <div className="w-full h-full bg-[#FDFBF7]/95 dark:bg-[#1F1D1A]/95 border border-[#C7BEB1] dark:border-[#49433B] rounded-2xl shadow-lg p-4 flex flex-col gap-4 overflow-y-auto pointer-events-auto">
          <div className="border-b border-[#D8D0C3] dark:border-[#3A352F] pb-3 flex items-center justify-between sticky top-0 bg-[#FDFBF7] dark:bg-[#1F1D1A] z-10 shrink-0">
            <h2 className="text-xs font-bold tracking-wide uppercase text-[#B93815] dark:text-[#F06A43] flex items-center gap-2">
              <Layers className="w-4 h-4" aria-hidden="true" />
              Layers Hierarchy
            </h2>
            <span className="text-[0.6875rem] text-[#5B534B] dark:text-[#B8AFA4] font-mono">
              {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
            </span>
          </div>

          {/* Layer Stack */}
          {layers.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto shrink-0 bg-[#EDE7DC]/55 dark:bg-[#292622]/55 border border-[#D8D0C3] dark:border-[#3A352F] rounded-xl p-1.5">
              {layers.map((layer, idx) => {
                const isSelected = selectedLayerId === layer.id;
                const isHidden = layer.visible === false;
                return (
                  <div
                    key={layer.id}
                    className={`rounded-lg border flex items-center justify-between gap-1 px-1.5 py-1 transition-colors ${
                      isSelected
                        ? 'bg-[#C23E1A]/10 dark:bg-[#F06A43]/15 border-[#C23E1A] dark:border-[#F06A43] text-[#1B1917] dark:text-[#F4EFE6]'
                        : 'bg-[#FDFBF7] dark:bg-[#1F1D1A] border-[#D8D0C3] dark:border-[#3A352F] hover:border-[#8F8578] dark:hover:border-[#756C61] text-[#1B1917] dark:text-[#E7E0D5]'
                    } ${isHidden ? 'opacity-65' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedLayerId(layer.id)}
                      aria-pressed={isSelected}
                      className="flex-1 min-w-0 flex items-center gap-2 py-0.5 px-1 text-left cursor-pointer rounded"
                    >
                      <span className="text-lg shrink-0">{layer.emoji}</span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span>Layer {layers.length - idx}</span>
                          {isHidden && (
                            <span className="text-[0.6875rem] font-mono font-normal px-1 rounded bg-[#EDE7DC] dark:bg-[#292622] text-[#5B534B] dark:text-[#B8AFA4]">
                              Hidden
                            </span>
                          )}
                        </span>
                        <span className="text-[0.6875rem] text-[#5B534B] dark:text-[#B8AFA4] truncate font-mono">
                          {EMOJI_STYLES.find((s) => s.id === layer.style)?.name || layer.style}
                        </span>
                      </span>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleLayerVisibility(layer.id)}
                        aria-pressed={!isHidden}
                        className="min-w-6 min-h-6 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-md text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] cursor-pointer"
                        title={isHidden ? 'Show Layer' : 'Hide Layer'}
                        aria-label={isHidden ? `Show Layer ${layers.length - idx}` : `Hide Layer ${layers.length - idx}`}
                      >
                        {isHidden ? (
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayerUp(layer.id)}
                        disabled={idx === layers.length - 1}
                        className="min-w-6 min-h-6 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-md disabled:opacity-30 text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] cursor-pointer"
                        title="Move Up"
                        aria-label="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayerDown(layer.id)}
                        disabled={idx === 0}
                        className="min-w-6 min-h-6 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-md disabled:opacity-30 text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] cursor-pointer"
                        title="Move Down"
                        aria-label="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLayer(layer.id)}
                        className="min-w-6 min-h-6 p-1.5 hover:bg-[#C23E1A]/15 rounded-md text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#B93815] dark:hover:text-[#F06A43] cursor-pointer"
                        title="Delete Layer"
                        aria-label="Delete Layer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Layer Controls */}
          {activeLayer ? (
            <div className="border-t border-[#D8D0C3] dark:border-[#3A352F] pt-3 flex flex-col gap-3.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#B93815] dark:text-[#F06A43]">
                  Layer Properties
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateLayer(activeLayer.id)}
                    className="min-w-7 min-h-7 p-1.5 rounded-lg border border-[#8F8578] dark:border-[#756C61] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] hover:bg-[#EDE7DC] dark:hover:bg-[#292622] cursor-pointer flex items-center justify-center"
                    title="Duplicate active layer"
                    aria-label="Duplicate active layer"
                  >
                    <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-pressed={Boolean(activeLayer.flipX)}
                    onClick={() => {
                      pushStateToUndo(layers);
                      setLayers((prev) =>
                        prev.map((l) => (l.id === activeLayer.id ? { ...l, flipX: !l.flipX } : l))
                      );
                    }}
                    className={`min-w-7 min-h-7 p-1.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-center ${
                      activeLayer.flipX
                        ? 'bg-[#C23E1A] text-white border-[#C23E1A]'
                        : 'border-[#8F8578] dark:border-[#756C61] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                    }`}
                    title="Flip Horizontal"
                    aria-label="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-pressed={Boolean(activeLayer.flipY)}
                    onClick={() => {
                      pushStateToUndo(layers);
                      setLayers((prev) =>
                        prev.map((l) => (l.id === activeLayer.id ? { ...l, flipY: !l.flipY } : l))
                      );
                    }}
                    className={`min-w-7 min-h-7 p-1.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-center ${
                      activeLayer.flipY
                        ? 'bg-[#C23E1A] text-white border-[#C23E1A]'
                        : 'border-[#8F8578] dark:border-[#756C61] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                    }`}
                    title="Flip Vertical"
                    aria-label="Flip Vertical"
                  >
                    <FlipVertical className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="layer-style"
                  className="block text-[0.6875rem] text-[#5B534B] dark:text-[#B8AFA4] font-semibold"
                >
                  Visual Style
                </label>
                <StudioSelect
                  id="layer-style"
                  ariaLabel="Visual Style"
                  value={activeLayer.style || selectedStyle}
                  options={EMOJI_STYLES.map((s) => ({
                    value: s.id,
                    label: s.name,
                    badge: s.format,
                  }))}
                  onChange={(styleId) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, style: styleId } : l))
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <StudioSlider
                  label="Scale"
                  valueDisplay={`${Math.round(activeLayer.scale * 100)}%`}
                  min={0.1}
                  max={2.5}
                  step={0.05}
                  value={activeLayer.scale}
                  onChange={(val) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, scale: val } : l))
                    )
                  }
                  onReset={() =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, scale: 0.85 } : l))
                    )
                  }
                />

                <StudioSlider
                  label="Rotation"
                  valueDisplay={`${activeLayer.rotation}°`}
                  min={-180}
                  max={180}
                  step={1}
                  value={activeLayer.rotation}
                  onChange={(val) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, rotation: Math.round(val) } : l))
                    )
                  }
                  onReset={() =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, rotation: 0 } : l))
                    )
                  }
                />

                <StudioSlider
                  label="Skew X"
                  valueDisplay={`${activeLayer.skewX || 0}°`}
                  min={-45}
                  max={45}
                  step={1}
                  value={activeLayer.skewX || 0}
                  onChange={(val) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, skewX: Math.round(val) } : l))
                    )
                  }
                  onReset={() =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, skewX: 0 } : l))
                    )
                  }
                />

                <StudioSlider
                  label="Skew Y"
                  valueDisplay={`${activeLayer.skewY || 0}°`}
                  min={-45}
                  max={45}
                  step={1}
                  value={activeLayer.skewY || 0}
                  onChange={(val) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, skewY: Math.round(val) } : l))
                    )
                  }
                  onReset={() =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, skewY: 0 } : l))
                    )
                  }
                />

                <StudioSlider
                  label="Opacity"
                  valueDisplay={`${Math.round((activeLayer.opacity !== undefined ? activeLayer.opacity : 1) * 100)}%`}
                  min={0}
                  max={1}
                  step={0.05}
                  value={activeLayer.opacity !== undefined ? activeLayer.opacity : 1}
                  onChange={(val) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, opacity: val } : l))
                    )
                  }
                  onReset={() =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, opacity: 1 } : l))
                    )
                  }
                  className="col-span-2"
                />
              </div>

              {/* Readable Style Variations Explorer */}
              <div className="space-y-1.5">
                <span className="text-[0.6875rem] font-semibold text-[#5B534B] dark:text-[#B8AFA4] block">
                  Style Variations Explorer
                </span>
                <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-[#EDE7DC]/55 dark:bg-[#292622]/55 border border-[#D8D0C3] dark:border-[#3A352F] rounded-xl">
                  {EMOJI_STYLES.map((style) => {
                    const url = getEmojiUrl(activeLayer.emoji || '', style.id);
                    const isActive = activeLayer.style === style.id;
                    return (
                      <div key={style.id} className="relative group">
                        <button
                          type="button"
                          onClick={() =>
                            setLayers((prev) =>
                              prev.map((l) => (l.id === activeLayer.id ? { ...l, style: style.id } : l))
                            )
                          }
                          aria-pressed={isActive}
                          className={`w-full p-1.5 border rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                            isActive
                              ? 'border-[#C23E1A] dark:border-[#F06A43] bg-[#C23E1A]/10 dark:bg-[#F06A43]/15'
                              : 'border-[#D8D0C3] dark:border-[#3A352F] bg-[#FDFBF7] dark:bg-[#1F1D1A] hover:border-[#8F8578] dark:hover:border-[#756C61]'
                          }`}
                        >
                          <img src={url} alt={style.name} loading="lazy" className="w-6 h-6 object-contain" />
                          <span className="text-[0.6875rem] text-[#5B534B] dark:text-[#B8AFA4] text-center truncate w-full font-medium mt-1">
                            {style.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addLayerWithStyle(activeLayer.emoji || '', style.id)}
                          className="absolute -top-1 -right-1 bg-[#C23E1A] hover:bg-[#A83314] text-white min-w-6 min-h-6 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold opacity-85 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity shadow-sm cursor-pointer"
                          title="Spawn new Layer in this style"
                          aria-label={`Spawn new Layer in ${style.name} style`}
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
            <div className="border-t border-[#D8D0C3] dark:border-[#3A352F] pt-4 text-center text-xs text-[#5B534B] dark:text-[#B8AFA4] shrink-0">
              No layer selected. Select an emoji on the canvas or add one from the library.
            </div>
          )}

          {/* Global Artboard & Export Settings */}
          <div className="border-t border-[#D8D0C3] dark:border-[#3A352F] pt-3.5 flex flex-col gap-3.5 shrink-0">
            <span className="text-xs font-bold text-[#B93815] dark:text-[#F06A43] block">
              Artboard Style
            </span>

            <div className="flex items-center gap-1 bg-[#EDE7DC] dark:bg-[#292622] p-1 border border-[#8F8578] dark:border-[#756C61] rounded-xl text-xs font-semibold text-center">
              <button
                type="button"
                aria-pressed={bgType === 'transparent'}
                onClick={() => setBgType('transparent')}
                className={`flex-1 min-h-7 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  bgType === 'transparent'
                    ? 'bg-[#C23E1A] text-white shadow-xs'
                    : 'text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                }`}
              >
                Invisible
              </button>
              <button
                type="button"
                aria-pressed={bgType === 'solid'}
                onClick={() => setBgType('solid')}
                className={`flex-1 min-h-7 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  bgType === 'solid'
                    ? 'bg-[#C23E1A] text-white shadow-xs'
                    : 'text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                }`}
              >
                Solid
              </button>
              <button
                type="button"
                aria-pressed={bgType === 'gradient'}
                onClick={() => setBgType('gradient')}
                className={`flex-1 min-h-7 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  bgType === 'gradient'
                    ? 'bg-[#C23E1A] text-white shadow-xs'
                    : 'text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                }`}
              >
                Gradient
              </button>
            </div>

            {bgType === 'solid' && (
              <StudioColorPicker label="Solid Color" value={solidBg} onChange={setSolidBg} />
            )}

            {bgType === 'gradient' && (
              <div className="grid grid-cols-5 gap-1.5 bg-[#EDE7DC]/70 dark:bg-[#292622]/70 p-2 border border-[#C7BEB1] dark:border-[#4D463E] rounded-xl">
                {GRADIENTS.slice(1).map((grad, idx) => {
                  const isActive = selectedGradient.name === grad.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedGradient(grad)}
                      aria-pressed={isActive}
                      aria-label={grad.name}
                      className={`h-6 rounded-md border transition-transform cursor-pointer flex items-center justify-center ${
                        isActive
                          ? 'border-[#1B1917] dark:border-[#F4EFE6] ring-2 ring-[#C23E1A] dark:ring-[#F06A43] scale-105'
                          : 'border-[#8F8578] dark:border-[#756C61] hover:scale-105'
                      } ${grad.preview}`}
                      style={{ forcedColorAdjust: 'none' }}
                      title={grad.name}
                    >
                      {isActive && <Check className="w-3 h-3 text-white drop-shadow" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}

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
                <span className="text-xs font-medium text-[#5B534B] dark:text-[#B8AFA4] block">
                  Export Size
                </span>
                <div className="grid grid-cols-4 gap-1 bg-[#EDE7DC] dark:bg-[#292622] p-1 border border-[#8F8578] dark:border-[#756C61] rounded-xl">
                  {[128, 256, 512, 1024].map((sizeOption) => {
                    const isActive = exportSize === sizeOption;
                    return (
                      <button
                        key={sizeOption}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setExportSize(sizeOption)}
                        className={`min-h-7 py-1.5 rounded-lg text-[0.6875rem] font-mono font-bold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#C23E1A] text-white shadow-xs'
                            : 'text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
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
            <div className="space-y-2.5 p-3 rounded-xl bg-[#EDE7DC]/65 dark:bg-[#292622]/70 border border-[#C7BEB1] dark:border-[#4D463E]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1B1917] dark:text-[#F4EFE6]">Drop Shadow</span>
                <button
                  type="button"
                  aria-pressed={shadowEnabled}
                  onClick={() => setShadowEnabled((prev) => !prev)}
                  className={`min-w-10 min-h-6 text-[0.6875rem] px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    shadowEnabled
                      ? 'bg-[#C23E1A] text-white border border-[#C23E1A]'
                      : 'bg-[#DFD7CA] dark:bg-[#3A352F] border border-[#8F8578] dark:border-[#756C61] text-[#5B534B] dark:text-[#B8AFA4]'
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
                    <div className="flex justify-between text-[#5B534B] dark:text-[#B8AFA4] text-[0.6875rem] font-medium mb-1">
                      <span>Intensity</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        aria-pressed={shadowColor === 'rgba(0, 0, 0, 0.45)'}
                        onClick={() => setShadowColor('rgba(0, 0, 0, 0.45)')}
                        className={`flex-1 min-h-7 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          shadowColor === 'rgba(0, 0, 0, 0.45)'
                            ? 'border-[#C23E1A] dark:border-[#F06A43] bg-[#C23E1A]/10 dark:bg-[#F06A43]/15 text-[#B93815] dark:text-[#F06A43]'
                            : 'border-[#8F8578] dark:border-[#756C61] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                        }`}
                      >
                        Soft
                      </button>
                      <button
                        type="button"
                        aria-pressed={shadowColor === 'rgba(0, 0, 0, 0.85)'}
                        onClick={() => setShadowColor('rgba(0, 0, 0, 0.85)')}
                        className={`flex-1 min-h-7 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          shadowColor === 'rgba(0, 0, 0, 0.85)'
                            ? 'border-[#C23E1A] dark:border-[#F06A43] bg-[#C23E1A]/10 dark:bg-[#F06A43]/15 text-[#B93815] dark:text-[#F06A43]'
                            : 'border-[#8F8578] dark:border-[#756C61] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                        }`}
                      >
                        Deep
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Batch ZIP & Cloud URL Actions */}
            <div className="border-t border-[#D8D0C3] dark:border-[#3A352F] pt-3 flex flex-col gap-2 text-xs">
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="w-full min-h-9 py-2 px-3 bg-[#1B1917] hover:bg-[#332E29] dark:bg-[#F4EFE6] dark:hover:bg-[#E2DBD0] text-[#FDFBF7] dark:text-[#161513] font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isZipping ? 'Creating ZIP...' : 'Download all Styles ZIP'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUploadImage('imgbb')}
                  disabled={isUploading !== ''}
                  className="min-h-9 bg-[#EDE7DC] dark:bg-[#292622] hover:bg-[#E2DBD0] dark:hover:bg-[#35312C] text-[#1B1917] dark:text-[#F4EFE6] font-semibold py-2 px-2 rounded-xl border border-[#8F8578] dark:border-[#756C61] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isUploading === 'imgbb' ? 'ImgBB...' : 'Link via ImgBB'}
                </button>
                <button
                  type="button"
                  onClick={() => handleUploadImage('imgur')}
                  disabled={isUploading !== ''}
                  className="min-h-9 bg-[#EDE7DC] dark:bg-[#292622] hover:bg-[#E2DBD0] dark:hover:bg-[#35312C] text-[#1B1917] dark:text-[#F4EFE6] font-semibold py-2 px-2 rounded-xl border border-[#8F8578] dark:border-[#756C61] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isUploading === 'imgur' ? 'Imgur...' : 'Link via Imgur'}
                </button>
              </div>

              {uploadResultUrl && (
                <div className="bg-[#EDE7DC]/70 dark:bg-[#292622]/70 border border-[#C7BEB1] dark:border-[#4D463E] rounded-xl p-2.5 flex flex-col gap-1.5">
                  <span className="text-[0.6875rem] text-[#5B534B] dark:text-[#B8AFA4] font-semibold">
                    Direct Link Result
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      aria-label="Direct Link Result URL"
                      value={uploadResultUrl}
                      className="flex-1 min-w-0 min-h-8 bg-[#FDFBF7] dark:bg-[#161513] border border-[#8F8578] dark:border-[#756C61] rounded-lg px-2 py-1 text-[0.6875rem] font-mono text-[#B93815] dark:text-[#F06A43] select-all"
                    />
                    <button
                      type="button"
                      aria-label="Copy result URL"
                      onClick={() => {
                        navigator.clipboard.writeText(uploadResultUrl);
                        showToast('Link copied!');
                      }}
                      className="min-w-8 min-h-8 px-2.5 bg-[#FDFBF7] dark:bg-[#1F1D1A] hover:bg-[#E2DBD0] dark:hover:bg-[#35312C] rounded-lg border border-[#8F8578] dark:border-[#756C61] text-[#1B1917] dark:text-[#F4EFE6] flex items-center justify-center cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* 5. Bottom Compact Shortcut Hint Pill */}
      <footer className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 bg-[#FDFBF7]/95 dark:bg-[#1F1D1A]/95 border border-[#C7BEB1] dark:border-[#49433B] rounded-full px-4 py-2 shadow-sm text-[0.6875rem] text-[#5B534B] dark:text-[#B8AFA4] text-center flex items-center gap-2 select-none pointer-events-none max-w-[92vw]">
        <Move className="w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43] shrink-0" aria-hidden="true" />
        <span className="truncate">
          Drag corners to resize • Drag stem to rotate • Right-click for Context Menu • Space+Drag to Pan • Ctrl+Scroll to Zoom
        </span>
      </footer>

      {/* 6. Native Top-Layer Settings & Licenses Dialog */}
      <dialog
        ref={settingsDialogRef}
        aria-labelledby="settings-modal-title"
        hidden={
          !settingsOpen &&
          (typeof HTMLDialogElement === 'undefined' ||
            typeof HTMLDialogElement.prototype.showModal !== 'function')
        }
        onCancel={(e) => {
          e.preventDefault();
          setSettingsOpen(false);
        }}
        onClick={(e) => {
          if (e.target === settingsDialogRef.current) {
            setSettingsOpen(false);
          }
        }}
        className="studio-modal m-auto p-0 bg-transparent border-0 max-w-md w-[calc(100vw-2rem)] shadow-2xl rounded-2xl text-[#1B1917] dark:text-[#F4EFE6]"
      >
        <div className="bg-[#FDFBF7] dark:bg-[#1F1D1A] border border-[#B8AFA3] dark:border-[#5D554B] rounded-2xl p-6 relative max-h-[88dvh] overflow-y-auto">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close settings"
            className="absolute top-4 right-4 min-w-8 min-h-8 p-1.5 rounded-lg text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] hover:bg-[#EDE7DC] dark:hover:bg-[#292622] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>

          <h2
            id="settings-modal-title"
            className="font-display text-lg font-extrabold text-[#1B1917] dark:text-[#F4EFE6] flex items-center gap-2 mb-4"
          >
            <Settings className="w-5 h-5 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" />
            API Settings
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="bg-[#EDE7DC]/75 dark:bg-[#292622]/80 p-3.5 border border-[#D8D0C3] dark:border-[#3A352F] rounded-xl">
              <h3 className="text-xs font-bold text-[#1B1917] dark:text-[#F4EFE6] flex items-center gap-1.5 mb-1">
                <Info className="w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" />
                Direct URLs Integration
              </h3>
              <p className="text-xs text-[#5B534B] dark:text-[#B8AFA4] leading-relaxed">
                Upload customized stickers directly from your browser using your own ImgBB or Imgur credentials. Keys stay strictly in local storage.
              </p>
            </div>

            <div>
              <label
                htmlFor="settings-imgbb-key"
                className="block text-xs font-bold text-[#1B1917] dark:text-[#F4EFE6] mb-1.5"
              >
                ImgBB API Key
              </label>
              <div className="relative">
                <input
                  id="settings-imgbb-key"
                  name="imgbbKey"
                  type={showImgbbKey ? 'text' : 'password'}
                  autoComplete="off"
                  value={apiKeys.imgbb}
                  onChange={(e) => setApiKeys({ ...apiKeys, imgbb: e.target.value })}
                  className="w-full min-h-10 rounded-xl bg-[#FDFBF7] dark:bg-[#161513] border border-[#8F8578] dark:border-[#756C61] focus:border-[#C23E1A] dark:focus:border-[#F06A43] pl-3.5 pr-11 py-2 text-[#1B1917] dark:text-[#F4EFE6] text-xs font-mono"
                  placeholder="Enter ImgBB API key..."
                />
                <button
                  type="button"
                  onClick={() => setShowImgbbKey((prev) => !prev)}
                  aria-pressed={showImgbbKey}
                  aria-label={showImgbbKey ? 'Hide ImgBB API Key' : 'Show ImgBB API Key'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] cursor-pointer rounded-lg"
                >
                  {showImgbbKey ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-imgur-id"
                className="block text-xs font-bold text-[#1B1917] dark:text-[#F4EFE6] mb-1.5"
              >
                Imgur Client ID
              </label>
              <div className="relative">
                <input
                  id="settings-imgur-id"
                  name="imgurClientId"
                  type={showImgurId ? 'text' : 'password'}
                  autoComplete="off"
                  value={apiKeys.imgur}
                  onChange={(e) => setApiKeys({ ...apiKeys, imgur: e.target.value })}
                  className="w-full min-h-10 rounded-xl bg-[#FDFBF7] dark:bg-[#161513] border border-[#8F8578] dark:border-[#756C61] focus:border-[#C23E1A] dark:focus:border-[#F06A43] pl-3.5 pr-11 py-2 text-[#1B1917] dark:text-[#F4EFE6] text-xs font-mono"
                  placeholder="Enter Imgur Client ID..."
                />
                <button
                  type="button"
                  onClick={() => setShowImgurId((prev) => !prev)}
                  aria-pressed={showImgurId}
                  aria-label={showImgurId ? 'Hide Imgur Client ID' : 'Show Imgur Client ID'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] cursor-pointer rounded-lg"
                >
                  {showImgurId ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {uploadHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#D8D0C3] dark:border-[#3A352F]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5B534B] dark:text-[#B8AFA4]">
                    Recent Uploads ({uploadHistory.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-xs text-[#B93815] dark:text-[#F06A43] hover:underline flex items-center gap-1 cursor-pointer"
                    title="Clear Upload History"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear History</span>
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-1.5 bg-[#EDE7DC]/55 dark:bg-[#292622]/55 border border-[#D8D0C3] dark:border-[#3A352F] rounded-xl">
                  {uploadHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-1.5 bg-[#FDFBF7] dark:bg-[#1F1D1A] rounded-lg border border-[#D8D0C3] dark:border-[#3A352F] text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{item.emoji}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[0.6875rem] text-[#5B534B] dark:text-[#B8AFA4] font-mono">
                            {item.host} • {item.date}
                          </span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#B93815] dark:text-[#F06A43] hover:underline truncate max-w-[180px] flex items-center gap-1"
                          >
                            <span className="truncate">{item.url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(item.url);
                          showToast('Link copied!');
                        }}
                        className="min-w-7 min-h-7 p-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] rounded-lg text-[#5B534B] dark:text-[#B8AFA4] shrink-0 cursor-pointer flex items-center justify-center"
                        title="Copy URL"
                        aria-label="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Licenses & Attribution disclosure */}
            <details className="faq-item border border-[#D8D0C3] dark:border-[#3A352F] rounded-xl px-3.5 py-2.5 bg-[#EDE7DC]/45 dark:bg-[#292622]/45">
              <summary className="flex items-center gap-2 text-xs font-bold text-[#1B1917] dark:text-[#F4EFE6] cursor-pointer">
                <ChevronRight className="faq-chevron w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43] shrink-0" aria-hidden="true" />
                <span>Licenses &amp; Emoji Attribution</span>
              </summary>
              <p className="text-xs text-[#5B534B] dark:text-[#B8AFA4] mt-2 leading-relaxed">
                This studio is a derivative composition tool. Open styles include Microsoft Fluent UI Emoji (MIT), Google Noto Color Emoji (Apache 2.0 / OFL), Twitter Twemoji (MIT), and OpenMoji (CC BY-SA 4.0). Vendor-specific sets (Apple, Meta, WhatsApp) remain the property of their respective owners for personal or educational reference.
              </p>
            </details>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex-1 min-h-10 py-2.5 border border-[#8F8578] dark:border-[#756C61] hover:bg-[#EDE7DC] dark:hover:bg-[#292622] text-[#1B1917] dark:text-[#F4EFE6] font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 min-h-10 py-2.5 bg-[#C23E1A] hover:bg-[#A83314] text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* 7. Canvas Custom Context Menu */}
      {contextMenu.visible && (
        <div
          role="menu"
          className="fixed z-50 bg-[#FDFBF7] dark:bg-[#1F1D1A] border border-[#B8AFA3] dark:border-[#5D554B] rounded-xl shadow-xl py-1.5 text-xs flex flex-col text-[#1B1917] dark:text-[#F4EFE6] pointer-events-auto min-w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.layerId ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (contextMenu.layerId) moveLayerUp(contextMenu.layerId);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] flex items-center gap-2 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" /> Bring Forward
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (contextMenu.layerId) moveLayerDown(contextMenu.layerId);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] flex items-center gap-2 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" /> Send Backward
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (contextMenu.layerId) duplicateLayer(contextMenu.layerId);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" /> Duplicate Layer
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (contextMenu.layerId) handleCopyLayer(contextMenu.layerId);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] flex items-center gap-2 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" /> Copy Layer Settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (contextMenu.layerId) deleteLayer(contextMenu.layerId);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 text-[#B93815] dark:text-[#F06A43] hover:bg-[#C23E1A]/10 border-t border-[#D8D0C3] dark:border-[#3A352F] mt-1 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete Layer
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handlePasteLayer();
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                disabled={!copiedLayerData}
                className="w-full text-left px-3 py-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] disabled:opacity-35 flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" /> Paste Layer
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPanX(0);
                  setPanY(0);
                  setCanvasZoom(0.85);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#EDE7DC] dark:hover:bg-[#292622] border-t border-[#D8D0C3] dark:border-[#3A352F] mt-1 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" /> Reset Viewport
              </button>
            </>
          )}
        </div>
      )}

      {/* Live Status Toast */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-[#1B1917] dark:bg-[#F4EFE6] text-[#FDFBF7] dark:text-[#161513] border border-[#C23E1A] dark:border-[#F06A43] font-semibold px-4 py-2 rounded-full shadow-lg animate-fade-in flex items-center gap-2 text-xs pointer-events-auto"
        >
          <Check className="w-4 h-4 text-[#F06A43] dark:text-[#C23E1A]" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
