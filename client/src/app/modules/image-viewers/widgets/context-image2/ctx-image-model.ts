import { Subject } from "rxjs";
import { ContextImage2DrawModel } from "./ctx-image-draw-model";
import { Point, Rect } from "src/app/models/Geometry";
import { ScanImage } from "src/app/generated-protos/image";
import { ImagePyramid } from "src/app/generated-protos/image-pyramid";


export class ContextImage2Model {
  needsDraw$: Subject<void> = new Subject<void>();
  drawModel = new ContextImage2DrawModel();
  private _pan: Point = new Point(0, 0);
  private _zoom: number = 1;
  private _imageName: string = "";
  //private _pyramid?: ImagePyramid;
  private _viewportSize: Point = new Point(1,1);

  setData(imageName: string, img: ScanImage, pyramid: ImagePyramid) {
    this._imageName = imageName;
    //this._pyramid = pyramid;
    this.drawModel.create(img, pyramid);
    this.resetPanZoom();
  }

  get imageName(): string {
    return this._imageName;
  }

  resetPanZoom() {
    this._pan = new Point(0, 0);
    this._zoom = 1;
    this.update();
  }

  setPan(pan: Point) {
    this._pan = pan;
    this.update();
  }

  panBy(drag: Point) {
    if (drag.x == 0 && drag.y == 0) {
      return;
    }

    this._pan.x += drag.x;
    this._pan.y += drag.y;

    console.log(`pan: ${this._pan.x}, ${this._pan.y}`);

    this.update();
  }

  get pan(): Point {
    return this._pan;
  }

  setZoom(zoom: number) {
    // Filter out rubbish
    if (zoom < 0.0001) {
      zoom = 0.0001;
    }
    if (zoom > 100) {
      zoom = 100;
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

  setViewportSize(w: number, h: number) {
    this._viewportSize = new Point(w, h);
    console.log(`setViewportSize: ${w} x ${h}`);
  }

  private update() {
    // Calculate the viewport rectangle considering pan and zoom
    //const viewport = new Rect(this._pan.x, this._pan.y, this._viewportSize.x * this._zoom, this._viewportSize.y * this._zoom);
    //this.drawModel.recalcTiles(viewport);
    this.drawModel.recalcTiles(this._pan, this._zoom, this._viewportSize);
    
    this.needsDraw$.next();
  }
}