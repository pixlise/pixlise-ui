import { Subject } from "rxjs";
import { ContextImage2DrawModel } from "./ctx-image-draw-model";
import { Point } from "src/app/models/Geometry";
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

    // this._pan.x += drag.x * this._viewportToWorldScale;
    // this._pan.y += drag.y * this._viewportToWorldScale;

    const xformCurr = this.viewportToWorld(currPos);
    const xformLast = this.viewportToWorld(lastPos);

    this._pan.x += xformCurr.x - xformLast.x;
    this._pan.y += xformCurr.y - xformLast.y;

    console.log(`pan: ${this._pan.x}, ${this._pan.y}`);

    this.update();
  }

  get pan(): Point {
    return this._pan;
  }

  setZoom(zoom: number) {
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

    console.log(`setZoom: ${zoom}`);

    this._zoom = zoom;

    this.update();
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
      this.drawModel.setOtherCursorPt(ptWorld, this._zoom);
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
    const cam = this.calcOrthoCamera();

    // Calculate cam frustum so we can work out what tiles need to be drawn
    const matrix = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);

    const camFrustum = new THREE.Frustum();
    camFrustum.setFromProjectionMatrix(matrix);

    // Work out how many image pixels are visible per viewport pixel
    const camWidth = cam.right-cam.left;
    const texPerScreenPixel = camWidth / this._viewportSize.x;

    //const frustumStr = `cam frustum [L: ${cam.left} R: ${cam.right} T: ${cam.top} B: ${cam.bottom}]`;
    const frustumStr = `cam frustum [${Math.floor(cam.right-cam.left)} x ${Math.floor(cam.top-cam.bottom)}]`;
    console.log(`UPDATE! viewport: [${this._viewportSize.x} x ${this._viewportSize.y}], zoom: ${this._zoom}, ${frustumStr}, cam pos: [${cam.position.x},${cam.position.y}] texPerScreenPixel: ${texPerScreenPixel}`);

    this.drawModel.updateTiles(texPerScreenPixel, camFrustum, this._zoom > 1, this.needsDraw$);
    
    this.needsDraw$.next();
  }

  private calcOrthoCamera() {
    // Worked example to calculate view parameters:

    // Aspect ratio of the viewport
    // eg 2766x770 = ~3.59 => Viewport is landscape
    const viewportAspect = this._viewportSize.x / this._viewportSize.y;

    const frustumSize = new Point(1, 1);
    const camCenteringOffset = new Point(0, 0);
    if (this._image) {
      // Calculate scale factor that fits the entire image into the viewport
      // eg 75264x45568 = ~1.65 => Image is landscape
      const imageAspect = this._image.width / this._image.height;

      // Pick the axis that needs to be fit in
      this._viewportToWorldScale = 1;
      if (imageAspect < viewportAspect) {
        // Work with Y axis
        this._viewportToWorldScale = this._image.height / this._viewportSize.y;
      } else {
        // Work with X axis
        this._viewportToWorldScale = this._image.width / this._viewportSize.x;
      }

      frustumSize.x = this._viewportSize.x * this._viewportToWorldScale;
      frustumSize.y = this._viewportSize.y * this._viewportToWorldScale;

      camCenteringOffset.x = this._image.width * 0.5;
      camCenteringOffset.y = this._image.height * 0.5;
    }

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