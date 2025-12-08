import * as THREE from 'three';
import { RenderData } from '../scan-3d-view/interactive-canvas-3d.component';
import { ScanImage } from 'src/app/generated-protos/image';
import { ImagePyramid, ImagePyramidLayer } from 'src/app/generated-protos/image-pyramid';
import { TileImageLoader } from './tile-loader';
import { Subject } from 'rxjs';
import { Point } from 'src/app/models/Geometry';


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
  protected _pipView?: THREE.Object3D;

  protected _tileBBoxes: THREE.Box3[][] = [];

  protected _lastPyramidLevel = -1;
  protected _lastPyramidLevelTilesVisible = new Set<number>();

  renderData: RenderData;

  private WHITE = new THREE.Color(1,1,1);
  private BLACK = new THREE.Color(0,0,0);
  private PURPLE = new THREE.Color(1,0,1);

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

    // In the background we draw the level 0 low-res image, as we zoom in
    // and reload tiles this should always be visible. Good enough for a
    // low effort solution while we improve the tile loading experience
    this._imageLocator = new THREE.Mesh(
      this.makeQuad(this._image.width, this._image.height),
      new THREE.MeshBasicMaterial({
        color: this.WHITE,
        map: layer0Texture,
        //side: THREE.DoubleSide
      })
    );
    this._imageLocator.position.set(0, 0, -20); // Set it so it's behind the pyramid tiles
    this._sceneAttachment.add(this._imageLocator);

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
  updateTiles(requestedTexPerScreenPixel: number, camFrustum: THREE.Frustum, drawPIPMap: boolean, redrawHook$: Subject<void>) {
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


    if (this._pipView && this._sceneAttachment) {
      this._sceneAttachment.remove(this._pipView)
    }

    if (drawPIPMap) {
      this.updatePIPView(camFrustum, requestedTexPerScreenPixel);
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
      //side: THREE.DoubleSide
    });

    // If we have this image available, use it now
    const cachedTexture = this._tileLoader!.getCachedTile(pyramidLevelIdx, tileX, tileY);
    if (cachedTexture) {
      tileMaterial.map = cachedTexture;
    }

    const newTile = this.makeTile(this._tileBBoxes[pyramidLevelIdx][tileIdx], tileMaterial);

    if (!cachedTexture) {
      // For now, dim the tile
      tileMaterial.opacity = 0.1;
      tileMaterial.transparent = true;

      // Load image asynchronously and when it arrives update the material
      this._tileLoader!.loadTileImage(pyramidLevelIdx, tileX, tileY).subscribe({
        next: (tileTexture: THREE.Texture) => {
          tileMaterial.opacity = 1;
          tileMaterial.transparent = false;

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

    // Draw as a triangle fan (anti-clockwise winding, shouldn't need "double sided" faces this way)
    result.setIndex(new THREE.BufferAttribute(new Uint32Array([0,2,1, 0,3,2]), 1));

    return result;
  }

  private updatePIPView(camFrustum: THREE.Frustum, requestedTexPerScreenPixel: number) {
    if (!this._sceneAttachment || !this._layer0Texture || !this._image) {
      return;
    }

    // Rebuild it all
    if (this._pipView) {
      this._sceneAttachment.remove(this._pipView)
    }

    // Update the PIP
    this._pipView = new THREE.Object3D();

    // Get frustum location
    let left = 0;
    let top = 0;
    let right = 0;
    let bottom = 0;
    for (const plane of camFrustum.planes) {
      if (plane.normal.x > 0.9 && plane.normal.y == 0 && plane.normal.z == 0) {
        left = -plane.constant;
      }
      if (plane.normal.x < -0.9 && plane.normal.y == 0 && plane.normal.z == 0) {
        right = plane.constant;
      }
      if (plane.normal.x == 0 && plane.normal.y > 0.9 && plane.normal.z == 0) {
        bottom = -plane.constant;
      }
      if (plane.normal.x == 0 && plane.normal.y < -0.9 && plane.normal.z == 0) {
        top = plane.constant;
      }
    }

    const frustumWidth = right-left;
    const frustumHeight = top-bottom;

    const scale = 0.1;

    const pipWidth = this._image.width * scale;
    const pipHeight = this._image.height * scale;

    // Draw the level 0 image into a PIP view
    let mat = new THREE.MeshBasicMaterial({
        color: this.WHITE,
        map: this._layer0Texture,
        //side: THREE.DoubleSide
    })
    const pipBG = new THREE.Mesh(this._tile, mat);
    pipBG.scale.set(1/this._tileSize * pipWidth, 1/this._tileSize * pipHeight, 1);
    pipBG.position.set(0,0,-9);

    this._pipView.add(pipBG);

    // Draw a border
    this._pipView.add(
      this.makeLines(
        this.makeRectPoints(pipWidth, pipHeight),
        0, 0,
        new THREE.LineBasicMaterial({
          color: this.BLACK,
          linewidth: 6,
          opacity: 0.3,
          transparent: true,
        })
      )
    );

    // Draw the frustum we're seeing - if it's too small change it into a cross-hair of constant size
    let frustumViewScale = scale;
    let drawCorners = false;
    if ((frustumWidth * requestedTexPerScreenPixel) < 800) {
      //frustumViewScale = 5;
      drawCorners = true;
    }

    const viewWidth = frustumWidth * frustumViewScale;
    const viewHeight = frustumHeight * frustumViewScale;

    let pts: number[] = [];

    // Add some lines that show the box corners more clearly when it's small
    if (drawCorners) {
      const sz = Math.max(frustumWidth, frustumHeight);
      const cornerVec = new Point(sz, sz);
      pts.push(
        -cornerVec.x, -cornerVec.y, 0,
        0, 0, 0,
        -cornerVec.x, cornerVec.y + viewHeight, 0,
        0, viewHeight, 0,
        cornerVec.x+viewWidth, -cornerVec.y, 0,
        viewWidth, 0, 0,
        cornerVec.x+viewWidth, cornerVec.y + viewHeight, 0,
        viewWidth, viewHeight, 0
      );
    } else {
      pts = this.makeRectPoints(viewWidth, viewHeight);
    }

    this._pipView.add(
      this.makeLines(
        pts,
        left * scale, bottom * scale,
        new THREE.LineBasicMaterial({
          color: this.PURPLE,
          linewidth: 3,
        })
      )
    );

    // Scale pip view to be independent of zoom level
    const pipScale = frustumWidth / this._image.width;
    this._pipView.scale.set(pipScale, pipScale, 1);

    // Move the pip view to the top-right
    //this._pipView.position.set(right - 100, top - frustumHeight, 0);
    this._pipView.position.set(left + frustumWidth * (1-scale*1.5), bottom + frustumHeight * (scale*0.5), 0);

    // Position it so it's always visible in the top-right of the view frustum
    // NOTE it's currently located at 0,0 relative to the image itself

    this._sceneAttachment.add(this._pipView)
  }

  private makeRectPoints(width: number, height: number) {
    return [
      0, 0, 0,
      0, height, 0,
      0, height, 0,
      width, height, 0,
      width, height, 0,
      width, 0, 0,
      width, 0, 0,
      0, 0, 0,
    ];
  }

  private makeLines(endPoints: number[], x: number, y: number, mat: THREE.LineBasicMaterial) {
    const points = new Float32Array(endPoints);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(points, 3));
    const mesh = new THREE.LineSegments(geom, mat);

    mesh.position.set(x, y, 0);
    return mesh;
  }
}
