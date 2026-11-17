declare module 'omggif' {
  export interface GifWriterGlobalOptions {
    loop?: number | null;
    palette?: number[] | null;
    background?: number;
  }

  export interface GifWriterFrameOptions {
    palette?: number[] | null;
    delay?: number;
    disposal?: number;
    transparent?: number | null;
  }

  export class GifWriter {
    constructor(buf: Uint8Array | number[], width: number, height: number, opts?: GifWriterGlobalOptions);
    addFrame(
      x: number,
      y: number,
      w: number,
      h: number,
      indexedPixels: Uint8Array | number[],
      opts?: GifWriterFrameOptions
    ): number;
    end(): number;
    getOutputBuffer(): Uint8Array | number[];
    setOutputBuffer(buf: Uint8Array | number[]): void;
    getOutputBufferPosition(): number;
    setOutputBufferPosition(pos: number): void;
  }

  export interface GifReaderFrameInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    has_local_palette: boolean;
    palette_offset: number | null;
    palette_size: number | null;
    data_offset: number;
    data_length: number;
    transparent_index: number | null;
    interlaced: boolean;
    delay: number;
    disposal: number;
  }

  export class GifReader {
    readonly width: number;
    readonly height: number;
    constructor(buf: Uint8Array);
    numFrames(): number;
    loopCount(): number | null;
    frameInfo(frameNum: number): GifReaderFrameInfo;
    decodeAndBlitFrameBGRA(frameNum: number, pixels: Uint8Array | Uint8ClampedArray): void;
    decodeAndBlitFrameRGBA(frameNum: number, pixels: Uint8Array | Uint8ClampedArray): void;
  }
}
