declare module 'canvas2svg' {
  class C2S extends CanvasRenderingContext2D {
    constructor(width: number, height: number);
    constructor(options: { width?: number; height?: number; document?: Document });
    getSerializedSvg(fixNamedEntities?: boolean): string;
    getSvg(): SVGElement;
  }
  export = C2S;
}
