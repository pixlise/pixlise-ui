import { Subject } from "rxjs";
import { ContextImage2DrawModel } from "./ctx-image-draw-model";
import { addVectors, Point, scaleVector, subtractVectors } from "src/app/models/Geometry";
import { ScanImage } from "src/app/generated-protos/image";
import { ImagePyramid } from "src/app/generated-protos/image-pyramid";
import * as THREE from 'three';
import { TileImageLoader } from "./tile-loader";

export enum WheelMode {
  ZOOM = "Zoom",
  SWAP_IMAGE = "Image",
  //Z_STACK,
  BRIGHTNESS = "Brightness"
};


export class ContextImage2Model {
  needsDraw$: Subject<void> = new Subject<void>();
  drawModel = new ContextImage2DrawModel();
  private _pan: Point = new Point(0, 0);
  private _zoom: number = 1;
  private _imagePath: string = "";
  private _imageName: string = "";
  private _imageScanId: string = "";
  private _image?: ScanImage;
  private _imageSmoothing: boolean = true;
  private _wheelMode: WheelMode = WheelMode.ZOOM;

  private _tileLoader?: TileImageLoader;
  
  private _viewportSize: Point = new Point(1,1);
  private _viewportToWorldScale = 1;

  imageBrightness: number = 1;

  constructor() {
    this.resetPanZoom();
  }

  setImage(imageName: string, img: ScanImage, pyramid: ImagePyramid, layer0Texture: THREE.Texture, tileLoader: TileImageLoader) {
    // NOTE: if the new image has different dimensions than the current one we reset our view
    const differentImage = img.width != this._image?.width || img.height != this._image?.height;

    this._imagePath = imageName;

    // Decompose it into scan id, and image name separated
    const bits = imageName.split("/");
    if (bits.length == 2 && bits[0].length > 0 && bits[1].length > 0) {
      this._imageName = bits[1];
      this._imageScanId = bits[0];
    } else {
      this._imageName = this._imagePath;
      this._imageScanId = "?";
    }

    this._image = img;
    this._tileLoader = tileLoader;

    this.drawModel.rebuildForImage(img, pyramid, layer0Texture, tileLoader);

    if (differentImage) {
      this.resetPanZoom();
      return;
    }

    this.update();
  }

  get imageName(): string {
    return this._imagePath;
  }

  get imageScanId(): string {
    return this._imageScanId;
  }

  get imageSmoothing(): boolean {
    return this._imageSmoothing;
  }

  set imageSmoothing(v: boolean) {
    this._imageSmoothing = v;

    if (this._tileLoader) {
      // Set texture filtering on all loaded textures
      this._tileLoader.setFiltering(
        this._imageSmoothing ? THREE.LinearFilter : THREE.NearestFilter,
        this._imageSmoothing ? THREE.LinearFilter : THREE.NearestFilter
      );
    }
  }

  private viewportToWorld(pt: Point): Point {
      // 0,0 is the center of the camera frustum for this, but our incoming coordinate has 0,0 being bottom-left
      // so adjust for this
      let v = new THREE.Vector3((pt.x / this._viewportSize.x)*2-1, (pt.y/this._viewportSize.y)*2-1, 0);
      v.unproject(this.drawModel.renderData.camera);
      return new Point(v.x, v.y);
  }

  getPIPPosition(mousePt: Point): Point | undefined {
    if (!this._image) {
      return undefined; // no image, nothing to do
    }

    const pipRect = this.drawModel.getPIPViewBoxWorldspace();
    if (pipRect.w <= 0 && pipRect.h <= 0) {
      return undefined; // we don't have a pip rect to work with...
    }

    const worldMousePt = this.viewportToWorld(mousePt);
    if (!pipRect.containsPoint(worldMousePt)) {
      return undefined // not over the rect
    }

    // Get the position we're at within the rect as a percentage, and work out where
    // that sits on the actual image
    const result = new Point((worldMousePt.x-pipRect.x) / pipRect.w, (worldMousePt.y-pipRect.y) / pipRect.h);
    result.x *= -this._image.width;
    result.y *= -this._image.height;

    // Now we have a coordinate on the image, but to move the image to have this coordinate centered, we have to:
    result.x += this._image.width * 0.5;
    result.y += this._image.height * 0.5;
    return result;
  }

  resetPanZoom() {
    this._pan = new Point(0, 0);
    this._zoom = 1;
    this.update();
  }

  setPanZoom(pan: Point, zoom?: number) {
    this._pan = pan;

    if (zoom !== undefined) {
      this.setZoom(zoom);
    } else {
      this.update();
    }
  }

  panBy(currPos: Point, lastPos: Point) {
    if (currPos.x-lastPos.x == 0 && currPos.y-lastPos.y == 0) {
      return;
    }

    const xformCurr = this.viewportToWorld(currPos);
    const xformLast = this.viewportToWorld(lastPos);

    this._pan = addVectors(this._pan, subtractVectors(xformCurr, xformLast));

    console.log(`pan: ${this._pan.x}, ${this._pan.y}`);

    this.update();
  }

  get pan(): Point {
    return this._pan;
  }

  setZoom(zoom: number, focusPt?: Point) {
    // if (!focusPt) {
    //   return;
    // }
    // Filter out rubbish
    if (zoom < 0.75) {
      zoom = 0.75;
    }
    if (zoom > 1000) {
      zoom = 1000;
    }
    if (!isFinite(zoom)) {
      zoom = 1;
    }

    const zoomRatio = zoom / this._zoom;
    this._zoom = zoom;

    console.log(`setZoom: ${zoom}`);

    // If a focus point is provided, we adjust pan to ensure we're zooming around the focus point    
    let focusPtWorld = focusPt ? this.viewportToWorld(focusPt) : undefined;

    if (focusPtWorld && zoomRatio != 1) {
      const centerPt = this.viewportToWorld(new Point(this._viewportSize.x/2, this._viewportSize.y/2));

      // Work out the offset that is required to keep our focus point in the same spot in the new framing
      const vec = subtractVectors(focusPtWorld, centerPt);
      const newVec = scaleVector(vec, zoomRatio);
      const offset = subtractVectors(newVec, vec);

      //console.log(`====> Calculated new focus point: ${focusPtWorld.x-offset.x},${focusPtWorld.y-offset.y}`);
      //console.log(`setZoom: adjusting pan by: ${offset.x}, ${offset.y}`);

      this._pan = subtractVectors(this._pan, offset);
    }

    this.update();
/* To calculate the offset correctly... (the above is almost there but zooming way in and out introduces some drifting!)
    if (focusPtWorld && focusPt) {
      const focusPtWorld2 = this.viewportToWorld(focusPt);
      const centerPt2 = this.viewportToWorld(new Point(this._viewportSize.x/2, this._viewportSize.y/2));

      console.log(`Focus points before ${focusPtWorld.x},${focusPtWorld.y} / after ${focusPtWorld2.x},${focusPtWorld2.y} zoom: ${zoom}`);

      const vec = new Point(focusPtWorld.x-centerPt.x, focusPtWorld.y-centerPt.y);
      const vec2 = new Point(focusPtWorld2.x-centerPt2.x, focusPtWorld2.y-centerPt2.y);

      const d = new Point(focusPtWorld2.x-focusPtWorld.x, focusPtWorld2.y-focusPtWorld.y);
      console.log(`zoom focus offset: ${d.x},${d.y}`);
      console.log(` centerPt: ${centerPt.x},${centerPt.y}`);
      console.log(` centerPt2: ${centerPt2.x},${centerPt2.y}`);
      console.log(` vec1: ${vec.x},${vec.y}`);
      console.log(` vec2: ${vec2.x},${vec2.y}`);
      console.log(` dvec: ${vec2.x-vec.x},${vec2.y-vec.y}, zoom: ${this._zoom}`);
      this._pan.x += d.x;
      this._pan.y += d.y;
      this.update();
    }*/
  }

  get zoom(): number {
    return this._zoom;
  }

  get wheelMode(): WheelMode {
    return this._wheelMode;
  }

  set wheelMode(m: WheelMode) {
    this._wheelMode = m;
  }

  setMousePresent(present: boolean) {
    this.drawModel.setMousePresent(present);
  }

  setOtherCursor(pt: Point) {
    //console.log(`setOtherCursor: ${pt.x}, ${pt.y}`);
    if (this.drawModel) {
      const ptWorld = this.viewportToWorld(pt);
      this.drawModel.setOtherCursorPt(ptWorld);
      this.needsDraw$.next();
    }
  }

  stepBrightness(up: boolean) {
    if (up) {
      this.imageBrightness += 0.1;
    } else {
      this.imageBrightness -= 0.1;
    }

    if (this.imageBrightness < 0.1) {
      this.imageBrightness = 0.1;
    }
    if (this.imageBrightness > 3) {
      this.imageBrightness = 3;
    }
  }

  setViewportSize(w: number, h: number) {
    this._viewportSize = new Point(w, h);

    this.update();
  }

  getDetails(): string {
    // For debugging pyramids/tiles:
    //return `${this._imagePath} [${this._image!.width} x ${this._image!.height}], zoom ${this._zoom.toFixed(2)} viewport ${this._viewportSize.x} x ${this._viewportSize.y} pyramid level ${this.drawModel.lastPyramidLevel} showing tiles [${Array.from(this.drawModel.lastPyramidLevelTilesVisible)}]`;

    // For nicer display
    return `${this._imageName}, resolution: ${this._image!.width} x ${this._image!.height}`;
  }

  getViewportSize(): Point {
    return this._viewportSize.copy();
  }

  private update() {
    if (!this._image) {
      console.warn("ContextImage2Model update called when no image loaded, ignored.");
      return;
    }

    // Recalculate camera position based on viewport, zoom and pan
    const imageSize = new Point(this._image.width, this._image.height);
    this._viewportToWorldScale = this.calcViewportToWorldScale(this._viewportSize, imageSize);

    const camCenteringOffset = new Point(imageSize.x * 0.5, imageSize.y * 0.5);
    const cam = this.calcOrthoCamera(this._viewportToWorldScale, camCenteringOffset);

    // Calculate cam frustum so we can work out what tiles need to be drawn
    const matrix = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);

    const camFrustum = new THREE.Frustum();
    camFrustum.setFromProjectionMatrix(matrix);

    // Work out how many image pixels are visible per viewport pixel
    const camWidth = cam.right-cam.left;
    const texPerScreenPixel = camWidth / this._viewportSize.x;

    // Also work out the worldspace "size" of a screen pixel, so we can draw lines/guides/points in a
    // consistant manner unaffected by zoom
    const worldspacePixelSize = (1/this._zoom) * this._viewportToWorldScale;
    // Another equivalent but slower way is to get 2 worldspace points 1 pixel apart:
      // const ptSize0 = this.viewportToWorld(new Point(0,0));
      // const ptSize1 = this.viewportToWorld(new Point(1,0));
      // const worldspacePixelSize = Math.abs(ptSize1.x-ptSize0.x);

    //const frustumStr = `cam frustum [L: ${cam.left} R: ${cam.right} T: ${cam.top} B: ${cam.bottom}]`;
    const frustumStr = `cam frustum [${Math.floor(cam.right-cam.left)} x ${Math.floor(cam.top-cam.bottom)}]`;
    console.log(`UPDATE! viewport: [${this._viewportSize.x} x ${this._viewportSize.y}], zoom: ${this._zoom}, ${frustumStr}, cam pos: [${cam.position.x},${cam.position.y}] texPerScreenPixel: ${texPerScreenPixel}`);

    this.drawModel.updateTiles(texPerScreenPixel, camFrustum, worldspacePixelSize, this._zoom > 1, this.needsDraw$);
    
    this.needsDraw$.next();
  }

  private calcViewportToWorldScale(viewportSize: Point, imageSize: Point): number {
    // Worked example to calculate view parameters:

    // Aspect ratio of the viewport
    // eg 2766x770 = ~3.59 => Viewport is landscape
    const viewportAspect = viewportSize.x / viewportSize.y;

    // Calculate scale factor that fits the entire image into the viewport
    // eg 75264x45568 = ~1.65 => Image is landscape
    const imageAspect = imageSize.x / imageSize.y;

    let viewportToWorldScale = 1;

      // Pick the axis that needs to be fit in
    if (imageAspect < viewportAspect) {
      // Work with Y axis
      viewportToWorldScale = imageSize.y / viewportSize.y;
    } else {
      // Work with X axis
      viewportToWorldScale = imageSize.x / viewportSize.x;
    }

    return viewportToWorldScale;
  }

  private calcOrthoCamera(viewportToWorldScale: number, camCenteringOffset: Point) {
    const frustumSize = new Point(this._viewportSize.x * viewportToWorldScale, this._viewportSize.y * viewportToWorldScale);

    const scale = 0.5 / this._zoom; // For half!
    const halfFrustumSize = new Point(frustumSize.x * scale, frustumSize.y * scale);

    const cam = this.drawModel.renderData.camera as THREE.OrthographicCamera;
    cam.left = -halfFrustumSize.x;
    cam.right = halfFrustumSize.x;

    cam.bottom = -halfFrustumSize.y;
    cam.top = halfFrustumSize.y;

    cam.position.set(-this._pan.x + camCenteringOffset.x, -this._pan.y + camCenteringOffset.y, 0);

    cam.updateMatrix();
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    return cam;
  }
}