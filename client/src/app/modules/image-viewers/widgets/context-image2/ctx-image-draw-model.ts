import * as THREE from 'three';
import { RenderData } from '../scan-3d-view/interactive-canvas-3d.component';
import { Point, Rect } from 'src/app/models/Geometry';
import { ScanImage } from 'src/app/generated-protos/image';
import { AABB, ImagePyramid } from 'src/app/generated-protos/image-pyramid';


export class ContextImage2DrawModel {
  protected _image?: ScanImage;
  protected _pyramid?: ImagePyramid;

  protected _sceneAttachment?: THREE.Object3D;
  protected _imageTiles?: THREE.Object3D;
  protected _tile?: THREE.BufferGeometry;
  protected _tileSize = 1;

  renderData: RenderData;

  constructor() {
    this.renderData = new RenderData(new THREE.Scene(), new THREE.PerspectiveCamera());
  }
  
  create(image: ScanImage, pyramid: ImagePyramid) {
    if (this._sceneAttachment) {
      this.renderData.scene.remove(this._sceneAttachment);
    }

    this._image = image;
    this._pyramid = pyramid;

    this._sceneAttachment = new THREE.Object3D();

    // Attach tiles to the scene if we have any?
    if (this._imageTiles) {
        this._sceneAttachment.add(this._imageTiles);
    }

    this.renderData.scene.add(this._sceneAttachment);
  }

  // Needs to be called if pan, zoom or viewport size changes
  recalcTiles(pan: Point, zoom: number, viewportSize: Point) {
    // Remove exiting from scene
    if (this._imageTiles) {
      this._sceneAttachment?.remove(this._imageTiles);
    }

    if (!this._image) {
      return;
    }

    if (!this._pyramid || this._pyramid.pyramid.length <= 0 || this._pyramid.pyramid[0].tiles.length <= 0) {
      return;
    }

    if (!this._tile) {
      // Generate a single tile geometry that we display
      if (!this.readPyramidProperties()) {
        return; // we had some issue with the pyramid...
      }

      // Create a tile
      this._tile = this.makeBaseTile(this._tileSize);
    }

    // NOTE: Zoom is a bit funky. We consider 1.0 to mean whatever it takes to fit the entire image into the viewport.
    // Zoom values < 1 mean smaller than the viewport, and > 1 means zooming into the image (eg at 2x zoom we scale the
    // image to double its size when fit to the viewport)

    // Calculate the scale factor for "1x" zooming
    // Worked example:
    // Viewport 2766x837, image 75264x45568
    // Viewed as "fit to width", we have 75264/2766 = ~27.21
    // Viewed as "fit to viewport", we have 45568/837 = ~54.44
    const fitToWidth = false;

    // Scale for fit works out to 27.21, in other words each screen pixel represents ~27 texture pixels
    const texPerScreenPixel = fitToWidth ?
                                (viewportSize.x > viewportSize.y ? this._image.width / viewportSize.x : this._image.height / viewportSize.y) :
                                (viewportSize.x < viewportSize.y ? this._image.width / viewportSize.x : this._image.height / viewportSize.y);

    console.log(`recalcTiles canvas: ${viewportSize.x} x ${viewportSize.y}, texPerScreenPixel: ${texPerScreenPixel}`);

    // User can adjust zoom level. This is the user saying we want to squash less texture pixels into the same screen pixel.
    // A zoom of 2x means we're now only wanting ~14 pixels per screen pixel. If the user zooms right in to 27x, we're showing
    // 1 texture pixel per screen pixel. As zoom increases, our "window" into the texture gets smaller
    const requestedTexPerScreenPixel = texPerScreenPixel / zoom;

    // Find the nearest pyramid level to this user request. This means if the user is greatly zoomed in (~27x) and
    // wants 1 tex/screen pixel, we're reading from the pyramid base level
    // The pyramid is increasing levels of 2x downscaling (from the bottom level), so an 8 level pyramid has
    // scaling levels of 1 2 4 8 16 32 64 128

    let pyramidLevel = 0;
    if (requestedTexPerScreenPixel > 1) {
      let lastLevelScale = 1;
      const numLevels = this._pyramid.pyramid.length;
      for (let c = 1; c < numLevels; c++) {
        const thisLevelScale = Math.pow(2, c);

        const distToLast = requestedTexPerScreenPixel-lastLevelScale;
        const distToThis = thisLevelScale-requestedTexPerScreenPixel;

        if (distToThis > 0) {
          if (distToLast < distToThis) {
            pyramidLevel = c-1;
          } else {
            pyramidLevel = c;
          }

          // Invert because we started looking at c=1 -> 2^1 = between 1x and 2x, ie pyramid base
          pyramidLevel = numLevels - c;
          break
        }
      }
    }

    console.log(`requestedTexPerScreenPixel: ${requestedTexPerScreenPixel} -> pyramid level: ${pyramidLevel} - ${this._pyramid.pyramid[pyramidLevel].bounds?.max?.x} x ${this._pyramid.pyramid[pyramidLevel].bounds?.max?.y}`);

    // Create meshes for each tile we're drawing
    this._imageTiles = new THREE.Object3D();

    const baseColour = new THREE.Color(0.1, 0.1, 0.1);

    const tilesWide = pyramidLevel+1; //pyramidLevel == 0 ? 1 : 0; //Math.max(Math.floor(viewportSize.x / this._tileSize), 1);
    const tilesHigh = pyramidLevel+1; //pyramidLevel == 0 ? 1 : 0; //Math.max(Math.floor(viewportSize.y / this._tileSize), 1);

    for (let y = 0; y < tilesHigh; y++) {
      for (let x = 0; x < tilesWide; x++) {
        const tileMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(baseColour.r + x / tilesWide * 0.5, baseColour.g + y / tilesHigh * 0.5, baseColour.b),
          side: THREE.DoubleSide
        });

        const tileMesh = new THREE.Mesh(
          this._tile,
          tileMaterial
        );

        tileMesh.position.set(x * this._tileSize, y * this._tileSize, 0);

        this._imageTiles.add(tileMesh);
      }
    }

    // const maxVPSize = imageViewport.w > imageViewport.h ? imageViewport.w : imageViewport.h;
    // this._imageTiles.scale.set(this._tileSize / maxVPSize, this._tileSize / maxVPSize, 1);

    //this._imageTiles.scale.set(this._tileSize / imageViewport.h, this._tileSize / imageViewport.w, 1);

    // const sz = viewportSize.x + viewportSize.y;
    // this._imageTiles.scale.set(this._tileSize / sz, this._tileSize / sz, 1);

    this._imageTiles.scale.set(zoom, zoom, 1);

    this._imageTiles.position.set(pan.x, pan.y, -1); 

    this._sceneAttachment?.add(this._imageTiles);
  }

  private readPyramidProperties(): boolean {
    if (!this._pyramid || this._pyramid.pyramid.length <= 0 || this._pyramid.pyramid[0].tiles.length <= 0) {
      return false;
    }

    // Find the tile size, assume it's constant for all levels of the pyramid
    // TODO: Should we provide this properly somehow from proto?
    const size = getAABBSize(this._pyramid.pyramid[this._pyramid.pyramid.length-1].tiles[0].bounds);

    if (size.x <= 0 || size.x != size.y) {
      return false; // unexpected tile size!
    }

    // Save the tile size for later
    this._tileSize = size.x;
    return true
  }

  private makeBaseTile(tileSize: number) {
    // Was useful for initial testing but not much else...
    //return new THREE.PlaneGeometry(tileSize, tileSize);

    const result = new THREE.BufferGeometry();

    const xyz = new Float32Array([
      0, 0, 0,
      tileSize, 0, 0,
      tileSize, tileSize, 0,
      0, tileSize, 0
    ]);

    result.setAttribute("position", new THREE.BufferAttribute(xyz, 3));

    const uv = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1
    ]);

    result.setAttribute("uv", new THREE.BufferAttribute(uv, 3));

    // Draw as a triangle fan
    result.setIndex(new THREE.BufferAttribute(new Uint32Array([0,1,2, 0,2,3]), 1));

    return result;
  }
}

// Some utils that should probably find their own home
function getAABBSize(box?: AABB): THREE.Vector3 {
  const min = new THREE.Vector3(
    box?.min?.x || 0,
    box?.min?.y || 0,
    box?.min?.z || 0,
  );

  const max = new THREE.Vector3(
    box?.max?.x || 0,
    box?.max?.y || 0,
    box?.max?.z || 0,
  );

  return new THREE.Vector3(max.x-min.x, max.y-min.y, max.z-min.z);
}