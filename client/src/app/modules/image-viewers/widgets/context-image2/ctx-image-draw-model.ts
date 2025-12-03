import * as THREE from 'three';
import { RenderData } from '../scan-3d-view/interactive-canvas-3d.component';
import { ScanImage } from 'src/app/generated-protos/image';
import { ImagePyramid, ImagePyramidLayer } from 'src/app/generated-protos/image-pyramid';
import { TileImageLoader } from './tile-loader';
import { Subject } from 'rxjs';


export class ContextImage2DrawModel {
  protected _image?: ScanImage;
  protected _pyramid?: ImagePyramid;
  protected _layer0Texture?: THREE.Texture;
  protected _tileLoader?: TileImageLoader;

  protected _sceneAttachment?: THREE.Object3D;
  protected _imageTiles?: THREE.Object3D;
  protected _imageTileCache = new Map<number, THREE.Mesh>();
  protected _imageLocator?: THREE.Mesh;
  protected _tile?: THREE.BufferGeometry;
  protected _tileSize = 1;

  protected _tileBBoxes: THREE.Box3[][] = [];

  protected _lastPyramidLevel = -1;
  protected _lastPyramidLevelTilesVisible = new Set<number>();

  renderData: RenderData;

  private WHITE = new THREE.Color(1,1,1);

  constructor() {
    this.renderData = new RenderData(
      new THREE.Scene(),
      new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 100)
      // new THREE.OrthographicCamera(-w/2, w/2, h/2, -h/2, 0, 100)
      // new THREE.OrthographicCamera(0, w, 0, h, 0, 100)
      // new THREE.OrthographicCamera(0, 100, 0, aspectRatio*100, 0, 100)
      // new THREE.PerspectiveCamera()
    );

    this.renderData.scene.add(this.renderData.camera);
  }

  rebuildForImage(image: ScanImage, pyramid: ImagePyramid, layer0Texture: THREE.Texture, tileLoader: TileImageLoader) {
    // Clear things if needed
    if (this._sceneAttachment) {
      this.renderData.scene.remove(this._sceneAttachment);
    }

    if (this._tileLoader) {
      this._tileLoader.clearCache();
    }

    this._imageTileCache.clear();

    this._lastPyramidLevel = -1;
    this._lastPyramidLevelTilesVisible.clear(); 

    this._image = image;
    this._pyramid = pyramid;

    this.generateTileBBoxes();
    // Generate bounding boxes compatible with THREE for each tile

    this._layer0Texture = layer0Texture;
    this._tileLoader = tileLoader;

    this._tileSize = this._pyramid.tileSize;

    // Create a tile
    this._tile = this.makeQuad(this._tileSize, this._tileSize);
    
    // Create the attachment point in the scene where we attach all our model data to
    this._sceneAttachment = new THREE.Object3D();

    // Create the image locator, a faint copy of the level 0 pyramid image
    // this._imageLocator = new THREE.Mesh(
    //   this.makeQuad(this._image.width, this._image.height),
    //   new THREE.MeshBasicMaterial({
    //     color: new THREE.Color(1,0.8,0.8),
    //     map: layer0Texture,
    //     opacity: 0.1,
    //     transparent: true,
    //     side: THREE.DoubleSide
    //   })
    // );
    // this._sceneAttachment.add(this._imageLocator);

    // A test cyan cube drawn towards the bottom-left in front of the image
    // let g = new THREE.BoxGeometry(1024,1024,2,1,1,1);
    // let m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    //   color: new THREE.Color(0,1,1),
    //   opacity: 1,
    //   transparent: false,
    //   //side: THREE.DoubleSide
    // }));
    // m.position.set(10000, 10000, -5);
    // this._sceneAttachment.add(m);

    this.renderData.scene.add(this._sceneAttachment);
  }

  private generateTileBBoxes() {
    this._tileBBoxes = [];

    if (!this._pyramid) {
      console.error(`generateTileBBoxes: No pyramid defined`);
      return;
    }

    for (let level = 0; level < this._pyramid.pyramid.length; level++) {
      const pyramidLevel = this._pyramid.pyramid[level];
      const pyramidTiles = pyramidLevel.tiles;
      const tileBBoxes: THREE.Box3[] = [];
      for (let c = 0; c < pyramidTiles.length; c++) {
        const tile = pyramidTiles[c];

        if (!tile.bounds || !tile.bounds.min || !tile.bounds.max) {
          console.error(`Failed to read pyramid level ${level} tile ${c} bounds`);
          return;
        }

        const bbox = new THREE.Box3(
          new THREE.Vector3(tile.bounds.min.x, tile.bounds.min.y, tile.bounds.min.z),
          new THREE.Vector3(tile.bounds.max.x, tile.bounds.max.y, tile.bounds.max.z + 1)
        );

        // Y axis is flipped when rendering, adjust for this
        // Eg level bounds max Y is 1424
        // BBox is 1024 high, at y=0
        // The box was defined to be at the top-left of the image (y=0) but our rendered Y axis
        // is flipped and 0 is bottom-left.
        // Therefore we want this tile to be drawn at 1424-1024
        bbox.max.y = pyramidLevel.bounds!.max!.y - bbox.max.y;
        bbox.min.y = pyramidLevel.bounds!.max!.y - bbox.min.y;

        // swap them (y axis is flipped, min just became max!)
        const tmp = bbox.max.y;
        bbox.max.y = bbox.min.y;
        bbox.min.y = tmp;

        tileBBoxes.push(bbox);
      }

      this._tileBBoxes.push(tileBBoxes);
    }
  }

  // Needs to be called if pan, zoom or viewport size changes
  updateTiles(requestedTexPerScreenPixel: number, camFrustum: THREE.Frustum, redrawHook$: Subject<void>) {
    if (!this._image ||
      !this._pyramid || this._pyramid.pyramid.length <= 0 || this._pyramid.pyramid[0].tiles.length <= 0 ||
      !this._tile) {
      console.error("updateTiles: Called without all data available");
      return;
    }

    // Find the nearest pyramid level to this user request. This means if the user is greatly zoomed in (~27x) and
    // wants 1 tex/screen pixel, we're reading from the pyramid base level
    // The pyramid is increasing levels of 2x downscaling (from the bottom level), so an 8 level pyramid has
    // scaling levels of 1 2 4 8 16 32 64 128

    const pyramidLevelIdx = this.pickPyramidLevel(requestedTexPerScreenPixel);
    const pyramidLevel = this._pyramid!.pyramid[pyramidLevelIdx];

    const pyramidTileScale = this._image.width / pyramidLevel.bounds!.max!.x; // / Math.pow(2, pyramidLevelIdx);
    console.log(`requestedTexPerScreenPixel: ${requestedTexPerScreenPixel} -> pyramid level: ${pyramidLevelIdx} - ${pyramidLevel.bounds?.max?.x} x ${pyramidLevel.bounds?.max?.y}, tile scale: ${pyramidTileScale}`);

    // We need to consider a new pyramid level, so throw out things we've cached for the previous layer
    if (this._lastPyramidLevel != pyramidLevelIdx) {
      // Throw out all old tiles and remove from scene
      this._imageTileCache.clear();
      this._lastPyramidLevelTilesVisible.clear();

      this._lastPyramidLevel = pyramidLevelIdx;
    }

    // Get a list of tiles visible for this pyramid layer
    const visibleTiles = this.listVisibleTiles(camFrustum, pyramidLevelIdx, pyramidTileScale);
    console.log(`  Visible Tiles: ${Array.from(visibleTiles.values())}`);

    if (!this.eqSet(visibleTiles, this._lastPyramidLevelTilesVisible)) {
      // New list of tiles differs from the previous list, so do update the tiles
      if (this._imageTiles) {
        this._sceneAttachment!.remove(this._imageTiles);
      }
      this._imageTiles = new THREE.Object3D();

      // Load tiles we do have from cache
      for (let tileIdx of visibleTiles) {
        let tile = this._imageTileCache.get(tileIdx);
        if (!tile) {
          // Generate the tile, cache it, and add it
          tile = this.generateTile(pyramidLevelIdx, pyramidLevel, tileIdx, redrawHook$);
          this._imageTileCache.set(tileIdx, tile);
        } else {
          console.log(`  Using cached tile: ${tileIdx}`);
        }

        if (tile) {
          this._imageTiles.add(tile);
        }
      }

      this._imageTiles.scale.set(pyramidTileScale, pyramidTileScale, 1);

      // Set it at a position where it'll be visible in the frustum
      this._imageTiles.position.set(0, 0, -10);

      this._sceneAttachment!.add(this._imageTiles);

      // Remember this for next time
      this._lastPyramidLevelTilesVisible = visibleTiles;
    } else {
      // tile list is the same, we can continue on!
      console.log("No tile generation needed");
    }
  }

  private eqSet(a: Set<number>, b: Set<number>) {
    return a.size === b.size &&
    [...a].every((x) => b.has(x));
  }

  private listVisibleTiles(camFrustum: THREE.Frustum, pyramidLevelIdx: number, pyramidTileScale: number): Set<number> {
    const visibleIdxs = new Set<number>();

    const selectedLevelTileBBoxes = this._tileBBoxes[pyramidLevelIdx];

    for (let c = 0; c < selectedLevelTileBBoxes.length; c++) {
      const thisBox = selectedLevelTileBBoxes[c];
      const box = new THREE.Box3(
        new THREE.Vector3(thisBox.min.x * pyramidTileScale, thisBox.min.y * pyramidTileScale, thisBox.min.z * pyramidTileScale),
        new THREE.Vector3(thisBox.max.x * pyramidTileScale, thisBox.max.y * pyramidTileScale, thisBox.max.z * pyramidTileScale)
      );

      if (camFrustum.intersectsBox(box)) {
        visibleIdxs.add(c);
      }
    }

    return visibleIdxs;
  }

  private pickPyramidLevel(requestedTexPerScreenPixel: number): number {
    let pyramidLevelIdx = 0;
    let lastLevelScale = 1;

    const numLevels = this._pyramid!.pyramid.length;
    for (let c = 1; c < numLevels; c++) {
      const thisLevelScale = Math.pow(2, c);

      const distToLast = requestedTexPerScreenPixel-lastLevelScale;
      const distToThis = thisLevelScale-requestedTexPerScreenPixel;

      if (distToThis > 0) {
        if (distToLast < distToThis) {
          pyramidLevelIdx = c-1;
        } else {
          pyramidLevelIdx = c;
        }

        // Invert because we started looking at c=1 -> 2^1 = between 1x and 2x, ie pyramid base
        pyramidLevelIdx = numLevels - c;
        break
      }
    }

    return pyramidLevelIdx;
  }

  private generateTile(pyramidLevelIdx: number, pyramidLevel: ImagePyramidLayer, tileIdx: number, redrawHook$: Subject<void>): THREE.Mesh {
    // Eg if we have a pyramid level that's 3 wide x 2 high tiles
    // Index 4 (0 based!) must become tileX = 1, tileY = 1
    const tileY = Math.floor(tileIdx / pyramidLevel.tilesWide);
    const tileX = Math.floor(tileIdx % pyramidLevel.tilesWide);

    console.log(`  Generating tile: ${tileIdx} [row ${tileY}, col ${tileX}]`);

    const tileMaterial = new THREE.MeshBasicMaterial({
      color: this.WHITE,
      side: THREE.DoubleSide
    });

    // If we have this image available, use it now
    const cachedTexture = this._tileLoader!.getCachedTile(pyramidLevelIdx, tileX, tileY);
    if (cachedTexture) {
      tileMaterial.map = cachedTexture;
    }

    const newTile = this.makeTile(this._tileBBoxes[pyramidLevelIdx][tileIdx], tileMaterial);

    if (!cachedTexture) {
      // Load image asynchronously and when it arrives update the material
      this._tileLoader!.loadTileImage(pyramidLevelIdx, tileX, tileY).subscribe({
        next: (tileTexture: THREE.Texture) => {
          tileMaterial.map = tileTexture;
          tileMaterial.needsUpdate = true;

          redrawHook$.next();
        },
        error: err => {
          console.error(`Failed to read tile for pyramid level: ${pyramidLevelIdx}, x: ${tileX}, y: ${tileY}. Error: ${err}`);
        }
      });
    }

    return newTile;
  }

  private makeTile(tileBBox: THREE.Box3, tileMaterial: THREE.MeshBasicMaterial): THREE.Mesh {
    const tileMesh = new THREE.Mesh(
      this._tile,
      tileMaterial
    );


    let sz = new THREE.Vector3(tileBBox.max.x-tileBBox.min.x, tileBBox.max.y-tileBBox.min.y, tileBBox.max.z-tileBBox.min.z);

    tileMesh.scale.set(sz.x / this._tileSize, sz.y / this._tileSize, 1);
    //tileMesh.position.set(tile.bounds!.min!.x, levelMaxY - tile.bounds!.min!.y - sz.y, 0);
    tileMesh.position.set(tileBBox.min.x, tileBBox.min.y, 0);

    return tileMesh;
  }

  private makeQuad(width: number, height: number) {
    // Was useful for initial testing but not much else...
    //return new THREE.PlaneGeometry(tileSize, tileSize);

    const result = new THREE.BufferGeometry();

    const xyz = new Float32Array([
      0, 0, 0,
      0, height, 0,
      width, height, 0,
      width, 0, 0,
    ]);

    result.setAttribute("position", new THREE.BufferAttribute(xyz, 3));

    const uv = new Float32Array([
      0, 0,
      0, 1,
      1, 1,
      1, 0,
    ]);

    result.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    // Draw as a triangle fan
    result.setIndex(new THREE.BufferAttribute(new Uint32Array([0,1,2, 0,2,3]), 1));

    return result;
  }
}
