export interface Layer {
  emoji?: string;
  style?: string;
  skewX?: number;
  skewY?: number;
  names?: string[];
  id: string;
  type?: 'emoji' | 'image' | 'text';
  content?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  visible?: boolean;
  opacity: number;
  flipX?: boolean;
  flipY?: boolean;
  zIndex?: number;
  locked?: boolean;
  brightness?: number;
  contrast?: number;
  hue?: number;
  saturation?: number;
  dropShadow?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  fontFamily?: string;
  textColor?: string;
  fontWeight?: string;
}

export interface UploadedHistory {
  id: string;
  emoji: string;
  style: string;
  date: string;
  host: string;
  url: string;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  layerId: string | null;
}

export interface DragState {
  layerId: string;
  type: 'move' | 'resize' | 'rotate' | null;
  mouseX: number;
  mouseY: number;
  layerX: number;
  layerY: number;
  layerScale: number;
  layerRotation: number;
}
