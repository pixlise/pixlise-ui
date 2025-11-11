# PIXLISE Image Viewer Scaling Roadmap

**Version:** 1.0
**Date:** 2025-11-11
**Status:** Planning Phase

---


*** CLAUDE MADE THIS -- I would suggest using this document to skim through / as a "brain storm helper". Critical thinking required to make sure
these ideas are actually good ones! / Anti

## Executive Summary

PIXLISE is scaling from Mars rover datasets (~30k beam locations, images <500MB) to Earth-based geological datasets with:
- **Images:** 2GB+ TIFF files, 30,000 × 20,000 pixels (600 megapixels)
- **Scan Points:** 100,000+ to millions of beam locations per sample
- **Multi-channel:** RGBU (4-channel) high-resolution imaging

The current monolithic rendering architecture will not scale to these requirements. This document outlines a comprehensive migration to a tile-based, spatially-indexed system.

---

## Current State Analysis

### Image Handling

**Current Architecture:**
- **Location:** `client/src/app/modules/image-viewers/widgets/context-image/`
- **Method:** Load entire image into memory as `HTMLImageElement` or `RGBUImage`
- **Rendering:** Single `drawImage()` call on Canvas2D
- **Limitations:**
  - Browser memory limits (~2GB per tab)
  - No progressive loading
  - Poor performance on large images
  - No zoom-appropriate detail levels

**Key Files:**
- `client/src/app/modules/pixlisecore/services/apiendpoints.service.ts:26-33` - Image loading
- `client/src/app/models/RGBUImage.ts` - Multi-channel TIFF model
- `client/src/app/modules/image-viewers/widgets/context-image/drawlib/draw-image.ts` - Image rendering

### Scan Point Handling

**Current Architecture:**
- **Location:** `client/src/app/modules/image-viewers/widgets/context-image/context-image-model-internals.ts`
- **Data Structure:** Flat `ScanPoint[]` array
- **Rendering:** 4+ loops through entire array per frame (no viewport culling)
- **Selection:** O(n) linear search on every click
- **Limitations:**
  - ~10k-20k point practical limit before frame drops
  - Unnecessary rendering of off-screen points
  - Voronoi polygons stored for all points (memory intensive)
  - No level-of-detail system

**Key Files:**
- `client/src/app/modules/image-viewers/widgets/context-image/drawlib/draw-scan-points.ts:7-100` - Point rendering (4 loops)
- `client/src/app/modules/image-viewers/widgets/context-image/context-image-scan-model-generator.ts` - Point data processing
- `client/src/app/modules/image-viewers/models/scan-point.ts` - Point model

### What Works Well (Keep These)

✅ **Pan/Zoom Transform System** (`pan-zoom.ts`)
- Matrix-based 2D transforms
- Multi-widget synchronization
- Tool integration (pan, zoom, selection)

✅ **Offscreen Canvas Caching** (`cached-drawer.ts`)
- Three-layer rendering (pre-data, data, post-data)
- Caches overlay layers separately from base image

✅ **Service Architecture**
- `ContextImageDataService` - Data coordination
- `APIDataService` - Request queuing
- `SelectionService` - Cross-widget selection

---

## Target Requirements

### Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| **Image Size** | 500MB max | 2GB+ |
| **Image Dimensions** | 4096 × 4096 | 30,000 × 20,000 |
| **Scan Points** | 30,000 | 1,000,000+ |
| **Initial Load Time** | 2-5s | <3s (progressive) |
| **Pan/Zoom FPS** | 60fps @ 10k points | 60fps @ 100k points |
| **Selection Response** | O(n) linear | O(log n) spatial |
| **Memory Usage** | ~1GB | <500MB client-side |

### Functional Requirements

✅ Backward compatibility with existing small datasets
✅ Progressive image loading (low-res → high-res)
✅ Level-of-detail for scan points based on zoom
✅ Multi-channel RGBU support retained
✅ All existing tools work (selection, ROI drawing, etc.)
✅ Offline caching for previously viewed regions

---

## Architecture Overview

### Tile-Based Image System

```
┌─────────────────────────────────────────────────────────┐
│                    Backend Changes                       │
├─────────────────────────────────────────────────────────┤
│  • Cloud Optimized GeoTIFF (COG) pipeline              │
│  • Tile server: GET /image/{id}/tiles/{z}/{x}/{y}.png  │
│  • Metadata endpoint: GET /image/{id}/metadata.json    │
│  • Multi-channel tile support for RGBU                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Frontend Changes                       │
├─────────────────────────────────────────────────────────┤
│  TileLoaderService                                       │
│    • Fetch tiles for visible viewport                   │
│    • LRU cache (500 tiles max)                          │
│    • Priority queue (center-out loading)                │
│    • Progressive loading (low-res fallback)             │
│                                                          │
│  ContextImageDrawer (modified)                           │
│    • Replace monolithic drawImage() with tile grid      │
│    • Calculate visible tiles from transform             │
│    • Render tiles in viewport only                      │
└─────────────────────────────────────────────────────────┘
```

### Spatial Point Index System

```
┌─────────────────────────────────────────────────────────┐
│               Quadtree Spatial Index                     │
├─────────────────────────────────────────────────────────┤
│  • Build on scan point load                             │
│  • O(log n) viewport queries                            │
│  • O(log n) nearest-point selection                     │
│  • Max 50 points per leaf node                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Level-of-Detail Manager                     │
├─────────────────────────────────────────────────────────┤
│  LOD 0 (zoom 6+):  100% points (all points visible)    │
│  LOD 1 (zoom 4-6): 50% points (every other)            │
│  LOD 2 (zoom 2-4): 25% points (spatial sample)         │
│  LOD 3 (zoom 1-2): 10% points (grid sample)            │
│  LOD 4 (zoom <1):  1% clusters (aggregated)            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Viewport Culling                         │
├─────────────────────────────────────────────────────────┤
│  1. Calculate world-space viewport bounds               │
│  2. Query quadtree for visible points (LOD-filtered)    │
│  3. Render only returned points (~100-5000)             │
│  4. Skip off-screen geometry entirely                   │
└─────────────────────────────────────────────────────────┘
```

### Synchronized Zoom Levels

| Zoom Level | Image Tiles | Point LOD | Point Count (100k dataset) | Use Case |
|------------|-------------|-----------|----------------------------|----------|
| 0-1 | 128px/tile overview | Clusters | ~1,000 clusters | Whole-sample view |
| 2-3 | 256px/tile | 10% sample | ~10,000 points | Region selection |
| 4-5 | 256px/tile | 50% sample | ~50,000 points | Feature inspection |
| 6-7 | 256px/tile | 100% all | ~5,000 (viewport) | Detail analysis |

---

## Implementation Roadmap

### Phase 1: Backend Image Tiling (3-4 weeks)

**Goal:** Enable tile-based image serving for large TIFFs

#### 1.1 COG Pipeline Setup (1 week)

**Tasks:**
- [ ] Install GDAL tools on processing server
- [ ] Create image conversion script (TIFF → Cloud Optimized GeoTIFF)
- [ ] Generate pyramids with 8 zoom levels (256×256 tiles)
- [ ] Test with sample 30k×20k TIFF
- [ ] Validate tile count and file sizes

**Deliverables:**
```bash
# Conversion script
./scripts/convert-to-cog.sh input.tif output_cog.tif

# Output structure:
# Level 0: 117×78 tiles (full 30k×20k resolution)
# Level 1: 59×39 tiles (15k×10k)
# Level 2: 30×20 tiles (7.5k×5k)
# ...
# Level 7: 1×1 tile (thumbnail)
```

**Tech Stack:**
- GDAL 3.x with COG driver
- Compression: DEFLATE or JPEG (configurable)
- Internal tiling: 256×256 or 512×512

**Acceptance Criteria:**
- COG files validate with `gdalinfo -checksum`
- File size <1.5× original uncompressed TIFF
- Tile extraction works: `gdal_translate -srcwin X Y 256 256`

#### 1.2 Tile Server API (1 week)

**Tasks:**
- [ ] Add tile endpoint to backend API
- [ ] Implement COG tile extraction via HTTP range requests
- [ ] Add CORS headers for frontend access
- [ ] Implement tile caching (Redis or filesystem)
- [ ] Add metadata endpoint

**API Specification:**

```go
// Backend (Go) - pixlise/core repository

// GET /image/{imageName}/tiles/{z}/{x}/{y}.png
// Returns: PNG tile (256×256 pixels)
// Errors: 404 if tile out of bounds

func HandleImageTile(w http.ResponseWriter, r *http.Request) {
    imageName := mux.Vars(r)["imageName"]
    z, _ := strconv.Atoi(mux.Vars(r)["z"])
    x, _ := strconv.Atoi(mux.Vars(r)["x"])
    y, _ := strconv.Atoi(mux.Vars(r)["y"])

    // Extract tile from COG using GDAL or geotiff library
    tileData := extractTileFromCOG(imageName, z, x, y)

    w.Header().Set("Content-Type", "image/png")
    w.Header().Set("Cache-Control", "public, max-age=31536000") // 1 year
    w.Write(tileData)
}

// GET /image/{imageName}/metadata.json
// Returns: Image metadata and tile configuration
func HandleImageMetadata(w http.ResponseWriter, r *http.Request) {
    imageName := mux.Vars(r)["imageName"]

    metadata := ImageMetadata{
        Width:      30000,
        Height:     20000,
        TileSize:   256,
        MinZoom:    0,
        MaxZoom:    7,
        Bounds:     [4]float64{0, 0, 30000, 20000},
        Channels:   4,  // RGBU
        Format:     "cog",
        Created:    time.Now(),
    }

    json.NewEncoder(w).Encode(metadata)
}
```

**Acceptance Criteria:**
- Tile endpoint returns valid PNG in <100ms
- Metadata endpoint returns correct dimensions
- Cache hit rate >90% after initial load
- CORS works for localhost and production domains

#### 1.3 RGBU Multi-Channel Support (1 week)

**Tasks:**
- [ ] Extend tile endpoint with channel selection
- [ ] Support channel composition: `?channels=R,G,B` or `?channels=R/G` (ratio)
- [ ] Implement server-side channel weighting
- [ ] Add per-channel tile caching
- [ ] Test with 4-channel TIFF samples

**API Extension:**

```
GET /image/{name}/tiles/{z}/{x}/{y}.png?channels=R,G,B&weights=1.0,0.8,0.6
GET /image/{name}/tiles/{z}/{x}/{y}.png?channels=R/G&min=0.5&max=2.0

Response: PNG with composed channels applied
```

**Alternative (Better Performance):**
```
# Serve individual channel tiles, compose on client with WebGL
GET /image/{name}/tiles/{z}/{x}/{y}/R.png
GET /image/{name}/tiles/{z}/{x}/{y}/G.png
GET /image/{name}/tiles/{z}/{x}/{y}/B.png
GET /image/{name}/tiles/{z}/{x}/{y}/U.png
```

**Acceptance Criteria:**
- Channel composition produces correct visual output
- Ratio images work (R/G, B/U, etc.)
- Performance: <150ms per tile with composition
- Individual channel tiles: <50ms per tile

#### 1.4 Backend Point Tiling (Optional, 1 week)

**For datasets with >1M points, implement point tiling:**

```go
// GET /scan/{scanId}/points?minX=1000&maxX=2000&minY=1000&maxY=2000&lod=2
// Returns: Points within bounding box at requested LOD

type PointTileRequest struct {
    MinX, MaxX, MinY, MaxY float64
    LOD                     int  // 0=full, 1=50%, 2=25%, etc.
}

type PointTileResponse struct {
    Points   []ScanPoint `json:"points"`
    Total    int         `json:"total"`    // Total points in scan
    Returned int         `json:"returned"` // Points in this tile
    LOD      int         `json:"lod"`
}
```

**Storage:**
- Use PostGIS with spatial index on point coordinates
- Or: Generate static point tiles during scan processing
- Structure: `/{scanId}/{lod}/{tileX}_{tileY}.json`

---

### Phase 2: Frontend Tile Rendering (3-4 weeks)

**Goal:** Replace monolithic image rendering with tile-based system

#### 2.1 TileLoaderService (1 week)

**Tasks:**
- [ ] Create `client/src/app/modules/pixlisecore/services/tile-loader.service.ts`
- [ ] Implement tile URL calculation from zoom/viewport
- [ ] Build LRU cache for loaded tiles (max 500 tiles)
- [ ] Add request prioritization (center-out loading)
- [ ] Implement progressive loading (show low-res while high-res loads)
- [ ] Add error handling for missing tiles

**Implementation:**

```typescript
// client/src/app/modules/pixlisecore/services/tile-loader.service.ts

import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

interface TileKey {
  z: number;
  x: number;
  y: number;
}

interface Tile {
  key: TileKey;
  image: HTMLImageElement | ImageBitmap;
  state: 'loading' | 'loaded' | 'error';
  timestamp: number;
}

interface ImageMetadata {
  width: number;
  height: number;
  tileSize: number;
  minZoom: number;
  maxZoom: number;
  bounds: [number, number, number, number];
  channels?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TileLoaderService {
  private _tileCache = new Map<string, Tile>();
  private _metadataCache = new Map<string, ImageMetadata>();
  private _maxCacheSize = 500;
  private _activeRequests = new Map<string, Observable<Tile>>();

  constructor(private _apiEndpointsService: APIEndpointsService) {}

  loadMetadata(imageName: string): Observable<ImageMetadata> {
    if (this._metadataCache.has(imageName)) {
      return of(this._metadataCache.get(imageName)!);
    }

    const url = `/image/${imageName}/metadata.json`;
    return this._apiEndpointsService.loadJSON<ImageMetadata>(url).pipe(
      map(metadata => {
        this._metadataCache.set(imageName, metadata);
        return metadata;
      })
    );
  }

  loadTile(imageName: string, z: number, x: number, y: number): Observable<Tile> {
    const cacheKey = this._getTileKey(imageName, z, x, y);

    // Return cached tile
    if (this._tileCache.has(cacheKey)) {
      const tile = this._tileCache.get(cacheKey)!;
      if (tile.state === 'loaded') {
        return of(tile);
      }
    }

    // Deduplicate concurrent requests
    if (this._activeRequests.has(cacheKey)) {
      return this._activeRequests.get(cacheKey)!;
    }

    // Load new tile
    const url = `/image/${imageName}/tiles/${z}/${x}/${y}.png`;
    const request$ = this._apiEndpointsService.loadImageForPath(url).pipe(
      map(img => {
        const tile: Tile = {
          key: { z, x, y },
          image: img,
          state: 'loaded',
          timestamp: Date.now()
        };
        this._addToCache(cacheKey, tile);
        this._activeRequests.delete(cacheKey);
        return tile;
      }),
      catchError(err => {
        console.warn(`Failed to load tile ${cacheKey}:`, err);
        const errorTile: Tile = {
          key: { z, x, y },
          image: new Image(),
          state: 'error',
          timestamp: Date.now()
        };
        this._activeRequests.delete(cacheKey);
        return of(errorTile);
      }),
      shareReplay(1)
    );

    this._activeRequests.set(cacheKey, request$);
    return request$;
  }

  getVisibleTiles(
    viewport: Rect,
    transform: PanZoom,
    metadata: ImageMetadata
  ): TileKey[] {
    const zoom = this._calculateZoomLevel(transform.scale.x, metadata);

    // Calculate tile coordinates that intersect viewport
    const worldBounds = transform.canvasToWorldSpace(viewport);

    const tileMinX = Math.max(0, Math.floor(worldBounds.x / metadata.tileSize));
    const tileMaxX = Math.min(
      Math.ceil((worldBounds.x + worldBounds.w) / metadata.tileSize),
      Math.pow(2, zoom)
    );
    const tileMinY = Math.max(0, Math.floor(worldBounds.y / metadata.tileSize));
    const tileMaxY = Math.min(
      Math.ceil((worldBounds.y + worldBounds.h) / metadata.tileSize),
      Math.pow(2, zoom)
    );

    const tiles: TileKey[] = [];
    for (let x = tileMinX; x < tileMaxX; x++) {
      for (let y = tileMinY; y < tileMaxY; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }

    return this._prioritizeTiles(tiles, viewport, transform);
  }

  private _calculateZoomLevel(scale: number, metadata: ImageMetadata): number {
    // Map scale factor to discrete zoom levels
    // scale 1.0 = native resolution = maxZoom
    // scale 0.5 = half resolution = maxZoom - 1
    const zoom = Math.floor(Math.log2(scale)) + metadata.maxZoom;
    return Math.max(metadata.minZoom, Math.min(metadata.maxZoom, zoom));
  }

  private _prioritizeTiles(
    tiles: TileKey[],
    viewport: Rect,
    transform: PanZoom
  ): TileKey[] {
    // Sort by distance from viewport center (load center tiles first)
    const viewportCenter = transform.canvasToWorldSpace(
      new Point(viewport.w / 2, viewport.h / 2)
    );

    return tiles.sort((a, b) => {
      const aCenter = new Point(
        (a.x + 0.5) * 256,
        (a.y + 0.5) * 256
      );
      const bCenter = new Point(
        (b.x + 0.5) * 256,
        (b.y + 0.5) * 256
      );

      const distA = Point.distanceBetween(aCenter, viewportCenter);
      const distB = Point.distanceBetween(bCenter, viewportCenter);

      return distA - distB;
    });
  }

  private _addToCache(key: string, tile: Tile): void {
    // LRU eviction
    if (this._tileCache.size >= this._maxCacheSize) {
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      for (const [k, t] of this._tileCache) {
        if (t.timestamp < oldestTime) {
          oldestTime = t.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this._tileCache.delete(oldestKey);
      }
    }

    this._tileCache.set(key, tile);
  }

  private _getTileKey(imageName: string, z: number, x: number, y: number): string {
    return `${imageName}/${z}/${x}/${y}`;
  }

  clearCache(): void {
    this._tileCache.clear();
    this._activeRequests.clear();
  }

  getCacheStats(): { size: number; max: number; hitRate: number } {
    return {
      size: this._tileCache.size,
      max: this._maxCacheSize,
      hitRate: 0 // TODO: Track hits/misses
    };
  }
}
```

**Acceptance Criteria:**
- Metadata loads correctly for test images
- Tile URLs calculated correctly for various zoom levels
- Cache evicts oldest tiles when full
- Progressive loading shows low-res tiles first
- Service handles network errors gracefully

#### 2.2 Update Context Image Drawer (1 week)

**Tasks:**
- [ ] Modify `drawPreData()` to render tiles instead of monolithic image
- [ ] Calculate visible tiles from viewport transform
- [ ] Implement tile rendering with proper positioning
- [ ] Add progressive rendering (low-res → high-res)
- [ ] Handle tile loading states (loading, error, loaded)
- [ ] Maintain backwards compatibility with small images

**Implementation:**

```typescript
// client/src/app/modules/image-viewers/widgets/context-image/context-image-drawer.ts

drawPreData(
  screenContext: CanvasRenderingContext2D,
  drawParams: ContextImageDrawParams
): void {
  // Check if this image should use tiling (based on size)
  if (this._shouldUseTiling(drawParams)) {
    this._drawTiledImage(screenContext, drawParams);
  } else {
    // Fallback for small images - keep existing behavior
    this._drawMonolithicImage(screenContext, drawParams);
  }
}

private _shouldUseTiling(drawParams: ContextImageDrawParams): boolean {
  // Use tiling for images >10 megapixels or >100MB
  const megapixels = (drawParams.imageWidth * drawParams.imageHeight) / 1_000_000;
  return megapixels > 10;
}

private _drawTiledImage(
  ctx: CanvasRenderingContext2D,
  drawParams: ContextImageDrawParams
): void {
  const viewport = new Rect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Get metadata (cached after first load)
  this._tileLoaderService.loadMetadata(drawParams.imageName).subscribe(metadata => {
    // Calculate which tiles are visible
    const visibleTiles = this._tileLoaderService.getVisibleTiles(
      viewport,
      drawParams.transform,
      metadata
    );

    console.log(`Rendering ${visibleTiles.length} tiles for ${drawParams.imageName}`);

    // Draw each tile
    visibleTiles.forEach(tileKey => {
      this._drawTile(ctx, tileKey, drawParams, metadata);
    });

    // Optional: Show loading indicator for pending tiles
    this._drawLoadingIndicator(ctx, visibleTiles);
  });
}

private _drawTile(
  ctx: CanvasRenderingContext2D,
  tileKey: TileKey,
  drawParams: ContextImageDrawParams,
  metadata: ImageMetadata
): void {
  this._tileLoaderService.loadTile(
    drawParams.imageName,
    tileKey.z,
    tileKey.x,
    tileKey.y
  ).subscribe(tile => {
    if (tile.state === 'loaded') {
      // Calculate tile position in world coordinates
      const tileWorldX = tileKey.x * metadata.tileSize;
      const tileWorldY = tileKey.y * metadata.tileSize;
      const tileWorldWidth = metadata.tileSize;
      const tileWorldHeight = metadata.tileSize;

      // Transform to screen coordinates
      const screenPos = drawParams.transform.worldToCanvasSpace(
        new Point(tileWorldX, tileWorldY)
      );
      const scaledWidth = tileWorldWidth * drawParams.transform.scale.x;
      const scaledHeight = tileWorldHeight * drawParams.transform.scale.y;

      // Apply image smoothing setting
      ctx.imageSmoothingEnabled = drawParams.imageSmoothingEnabled;

      // Draw tile
      ctx.drawImage(
        tile.image,
        screenPos.x,
        screenPos.y,
        scaledWidth,
        scaledHeight
      );
    } else if (tile.state === 'loading') {
      // Draw lower-resolution parent tile as placeholder
      this._drawParentTileFallback(ctx, tileKey, drawParams, metadata);
    } else if (tile.state === 'error') {
      // Draw error indicator
      this._drawTileError(ctx, tileKey, drawParams, metadata);
    }
  });
}

private _drawParentTileFallback(
  ctx: CanvasRenderingContext2D,
  tileKey: TileKey,
  drawParams: ContextImageDrawParams,
  metadata: ImageMetadata
): void {
  if (tileKey.z === 0) return; // No parent available

  // Load parent tile at lower zoom level
  const parentKey: TileKey = {
    z: tileKey.z - 1,
    x: Math.floor(tileKey.x / 2),
    y: Math.floor(tileKey.y / 2)
  };

  // Try to get from cache (don't trigger new load)
  const cacheKey = `${drawParams.imageName}/${parentKey.z}/${parentKey.x}/${parentKey.y}`;
  const parentTile = this._tileLoaderService['_tileCache'].get(cacheKey);

  if (parentTile?.state === 'loaded') {
    // Draw upscaled parent tile (will be blurry but better than nothing)
    const tileWorldX = tileKey.x * metadata.tileSize;
    const tileWorldY = tileKey.y * metadata.tileSize;

    const screenPos = drawParams.transform.worldToCanvasSpace(
      new Point(tileWorldX, tileWorldY)
    );
    const scaledSize = metadata.tileSize * drawParams.transform.scale.x;

    ctx.save();
    ctx.globalAlpha = 0.5; // Slightly transparent to indicate it's a placeholder
    ctx.drawImage(
      parentTile.image,
      screenPos.x,
      screenPos.y,
      scaledSize,
      scaledSize
    );
    ctx.restore();
  }
}

private _drawMonolithicImage(
  ctx: CanvasRenderingContext2D,
  drawParams: ContextImageDrawParams
): void {
  // Keep existing implementation for small images
  // ... existing drawImage() code ...
}
```

**Acceptance Criteria:**
- Tiles render at correct positions
- Zoom in/out loads appropriate tile levels
- Pan shows new tiles smoothly
- Small images still work with old rendering path
- No visual gaps between tiles

#### 2.3 RGBU Multi-Channel UI (1 week)

**Tasks:**
- [ ] Add channel selection controls to image widget
- [ ] Implement real-time channel weight adjustment
- [ ] Support ratio mode tiles (R/G, B/U, etc.)
- [ ] Update color mapping for multi-channel data
- [ ] Test with 4-channel TIFF samples

**UI Mockup:**

```
┌─────────────────────────────────────┐
│  Image Controls                     │
├─────────────────────────────────────┤
│  Channels:                          │
│    ☑ Red    [========  ] 1.0       │
│    ☑ Green  [======    ] 0.8       │
│    ☑ Blue   [====      ] 0.6       │
│    ☐ UV     [          ] 0.0       │
│                                     │
│  Mode: ○ Composite  ● Ratio (R/G)  │
│                                     │
│  [Apply] [Reset]                    │
└─────────────────────────────────────┘
```

**Implementation:**

```typescript
// Add to context-image.component.ts

interface ChannelConfig {
  enabled: boolean;
  weight: number;
  name: 'R' | 'G' | 'B' | 'U';
}

channelConfig: ChannelConfig[] = [
  { enabled: true, weight: 1.0, name: 'R' },
  { enabled: true, weight: 1.0, name: 'G' },
  { enabled: true, weight: 1.0, name: 'B' },
  { enabled: false, weight: 0.0, name: 'U' }
];

onChannelChange(): void {
  // Rebuild tile URLs with channel parameters
  const channels = this.channelConfig
    .filter(c => c.enabled)
    .map(c => c.name)
    .join(',');

  const weights = this.channelConfig
    .filter(c => c.enabled)
    .map(c => c.weight)
    .join(',');

  // Trigger tile reload with new parameters
  this._tileLoaderService.setChannelParams(channels, weights);
  this.redraw();
}
```

**Acceptance Criteria:**
- Channel weights update tiles in real-time
- Ratio mode generates correct tiles
- Performance: <500ms to switch channels
- UI state persists in layout save

#### 2.4 Progressive Loading & Polish (3-4 days)

**Tasks:**
- [ ] Implement thumbnail → full-res progressive loading
- [ ] Add subtle loading spinner for pending tiles
- [ ] Show tile count and cache stats in debug mode
- [ ] Optimize tile request batching
- [ ] Add keyboard shortcuts for testing (Ctrl+T: toggle tile boundaries)

**Progressive Loading:**

```typescript
class ProgressiveLoader {
  loadImageProgressively(
    imageName: string,
    viewport: Rect,
    transform: PanZoom
  ): void {
    // 1. Load thumbnail (zoom level 0) immediately
    this._loadThumbnail(imageName);

    // 2. Load medium-res tiles (3 zoom levels below target)
    setTimeout(() => {
      this._loadTilesAtZoom(imageName, targetZoom - 3, viewport);
    }, 100);

    // 3. Load target-res tiles (prioritized)
    setTimeout(() => {
      this._loadTilesAtZoom(imageName, targetZoom, viewport);
    }, 200);
  }
}
```

**Acceptance Criteria:**
- Users see blurry image within 200ms
- Full-res appears within 1-2 seconds
- Loading indicators are subtle and non-intrusive
- Debug overlay shows tile boundaries and LOD level

---

### Phase 3: Spatial Point Optimization (3 weeks)

**Goal:** Replace linear point arrays with spatial index for viewport culling and fast selection

#### 3.1 Quadtree Implementation (1 week)

**Tasks:**
- [ ] Create `client/src/app/utils/spatial/quadtree.ts`
- [ ] Implement insertion, query, and nearest-point search
- [ ] Add unit tests for edge cases
- [ ] Performance benchmark against flat array

**Implementation:**

```typescript
// client/src/app/utils/spatial/quadtree.ts

import { Point, Rect } from './geometry';

export interface QuadtreeItem {
  coord: Point;
  [key: string]: any; // Allow arbitrary additional properties
}

interface QuadtreeNode<T extends QuadtreeItem> {
  bounds: Rect;
  points: T[];
  children: [
    QuadtreeNode<T> | null,  // NW
    QuadtreeNode<T> | null,  // NE
    QuadtreeNode<T> | null,  // SW
    QuadtreeNode<T> | null   // SE
  ] | null;
  maxPoints: number;
  depth: number;
}

export class Quadtree<T extends QuadtreeItem> {
  private _root: QuadtreeNode<T>;
  private _maxDepth: number = 12;
  private _count: number = 0;

  constructor(bounds: Rect, maxPointsPerNode: number = 50) {
    this._root = {
      bounds,
      points: [],
      children: null,
      maxPoints: maxPointsPerNode,
      depth: 0
    };
  }

  insert(item: T): void {
    if (!this._pointInBounds(item.coord, this._root.bounds)) {
      console.warn('Point outside quadtree bounds:', item.coord);
      return;
    }

    this._insertIntoNode(this._root, item);
    this._count++;
  }

  queryRange(bounds: Rect): T[] {
    const results: T[] = [];
    this._queryNode(this._root, bounds, results);
    return results;
  }

  findNearest(point: Point, maxDistance: number): T | null {
    let nearest: T | null = null;
    let minDistSq = maxDistance * maxDistance;

    this._nearestSearch(this._root, point, (candidate) => {
      const distSq = Point.distanceSquaredBetween(point, candidate.coord);
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = candidate;
      }
    });

    return nearest;
  }

  findNearestN(point: Point, n: number, maxDistance: number): T[] {
    const candidates: Array<{ item: T; distSq: number }> = [];

    this._nearestSearch(this._root, point, (candidate) => {
      const distSq = Point.distanceSquaredBetween(point, candidate.coord);
      if (distSq <= maxDistance * maxDistance) {
        candidates.push({ item: candidate, distSq });
      }
    });

    // Sort by distance and return top N
    return candidates
      .sort((a, b) => a.distSq - b.distSq)
      .slice(0, n)
      .map(c => c.item);
  }

  getCount(): number {
    return this._count;
  }

  getBounds(): Rect {
    return this._root.bounds;
  }

  clear(): void {
    this._root.points = [];
    this._root.children = null;
    this._count = 0;
  }

  // --- Private methods ---

  private _insertIntoNode(node: QuadtreeNode<T>, item: T): void {
    // If node has children, insert into appropriate child
    if (node.children) {
      const childIdx = this._getChildIndex(node, item.coord);
      if (node.children[childIdx]) {
        this._insertIntoNode(node.children[childIdx]!, item);
        return;
      }
    }

    // Add to this node
    node.points.push(item);

    // Subdivide if over capacity and not too deep
    if (node.points.length > node.maxPoints && node.depth < this._maxDepth) {
      this._subdivide(node);
    }
  }

  private _subdivide(node: QuadtreeNode<T>): void {
    const { x, y, w, h } = node.bounds;
    const hw = w / 2;
    const hh = h / 2;

    node.children = [
      // NW
      {
        bounds: new Rect(x, y, hw, hh),
        points: [],
        children: null,
        maxPoints: node.maxPoints,
        depth: node.depth + 1
      },
      // NE
      {
        bounds: new Rect(x + hw, y, hw, hh),
        points: [],
        children: null,
        maxPoints: node.maxPoints,
        depth: node.depth + 1
      },
      // SW
      {
        bounds: new Rect(x, y + hh, hw, hh),
        points: [],
        children: null,
        maxPoints: node.maxPoints,
        depth: node.depth + 1
      },
      // SE
      {
        bounds: new Rect(x + hw, y + hh, hw, hh),
        points: [],
        children: null,
        maxPoints: node.maxPoints,
        depth: node.depth + 1
      }
    ];

    // Redistribute points to children
    const pointsToRedistribute = node.points;
    node.points = [];

    for (const point of pointsToRedistribute) {
      const childIdx = this._getChildIndex(node, point.coord);
      node.children[childIdx]!.points.push(point);
    }
  }

  private _getChildIndex(node: QuadtreeNode<T>, point: Point): number {
    const midX = node.bounds.x + node.bounds.w / 2;
    const midY = node.bounds.y + node.bounds.h / 2;

    const isWest = point.x < midX;
    const isNorth = point.y < midY;

    if (isNorth) {
      return isWest ? 0 : 1; // NW : NE
    } else {
      return isWest ? 2 : 3; // SW : SE
    }
  }

  private _queryNode(
    node: QuadtreeNode<T>,
    bounds: Rect,
    results: T[]
  ): void {
    // Skip if node doesn't intersect query bounds
    if (!this._boundsIntersect(node.bounds, bounds)) {
      return;
    }

    // Add points from this node that fall within query bounds
    for (const point of node.points) {
      if (this._pointInBounds(point.coord, bounds)) {
        results.push(point);
      }
    }

    // Recursively query children
    if (node.children) {
      for (const child of node.children) {
        if (child) {
          this._queryNode(child, bounds, results);
        }
      }
    }
  }

  private _nearestSearch(
    node: QuadtreeNode<T>,
    point: Point,
    callback: (item: T) => void
  ): void {
    // Check all points in this node
    for (const item of node.points) {
      callback(item);
    }

    // Recursively search children (sorted by distance to query point)
    if (node.children) {
      const childDistances = node.children.map((child, idx) => ({
        idx,
        distSq: child ? this._distanceSquaredToRect(point, child.bounds) : Infinity
      }));

      childDistances.sort((a, b) => a.distSq - b.distSq);

      for (const { idx } of childDistances) {
        const child = node.children[idx];
        if (child) {
          this._nearestSearch(child, point, callback);
        }
      }
    }
  }

  private _pointInBounds(point: Point, bounds: Rect): boolean {
    return (
      point.x >= bounds.x &&
      point.x < bounds.x + bounds.w &&
      point.y >= bounds.y &&
      point.y < bounds.y + bounds.h
    );
  }

  private _boundsIntersect(a: Rect, b: Rect): boolean {
    return !(
      a.x + a.w < b.x ||
      b.x + b.w < a.x ||
      a.y + a.h < b.y ||
      b.y + b.h < a.y
    );
  }

  private _distanceSquaredToRect(point: Point, rect: Rect): number {
    const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.w));
    const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.h));
    return dx * dx + dy * dy;
  }

  // --- Debug/Stats methods ---

  getStats(): {
    totalNodes: number;
    maxDepth: number;
    avgPointsPerLeaf: number;
  } {
    let nodeCount = 0;
    let leafCount = 0;
    let totalLeafPoints = 0;
    let maxDepth = 0;

    const traverse = (node: QuadtreeNode<T>) => {
      nodeCount++;
      maxDepth = Math.max(maxDepth, node.depth);

      if (!node.children) {
        leafCount++;
        totalLeafPoints += node.points.length;
      } else {
        for (const child of node.children) {
          if (child) traverse(child);
        }
      }
    };

    traverse(this._root);

    return {
      totalNodes: nodeCount,
      maxDepth,
      avgPointsPerLeaf: leafCount > 0 ? totalLeafPoints / leafCount : 0
    };
  }
}
```

**Unit Tests:**

```typescript
// client/src/app/utils/spatial/quadtree.spec.ts

describe('Quadtree', () => {
  it('should insert and query points', () => {
    const bounds = new Rect(0, 0, 1000, 1000);
    const qt = new Quadtree<{coord: Point, id: number}>(bounds);

    for (let i = 0; i < 1000; i++) {
      qt.insert({
        coord: new Point(Math.random() * 1000, Math.random() * 1000),
        id: i
      });
    }

    const results = qt.queryRange(new Rect(400, 400, 200, 200));
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThan(1000);
  });

  it('should find nearest point', () => {
    const qt = new Quadtree<{coord: Point, id: number}>(new Rect(0, 0, 100, 100));
    qt.insert({ coord: new Point(10, 10), id: 1 });
    qt.insert({ coord: new Point(50, 50), id: 2 });
    qt.insert({ coord: new Point(90, 90), id: 3 });

    const nearest = qt.findNearest(new Point(12, 12), 100);
    expect(nearest?.id).toBe(1);
  });

  it('should handle points outside bounds gracefully', () => {
    const qt = new Quadtree<{coord: Point, id: number}>(new Rect(0, 0, 100, 100));
    qt.insert({ coord: new Point(200, 200), id: 1 }); // Outside
    expect(qt.getCount()).toBe(0);
  });

  it('should subdivide when capacity exceeded', () => {
    const qt = new Quadtree<{coord: Point, id: number}>(new Rect(0, 0, 100, 100), 10);

    for (let i = 0; i < 50; i++) {
      qt.insert({ coord: new Point(50, 50 + i * 0.1), id: i });
    }

    const stats = qt.getStats();
    expect(stats.maxDepth).toBeGreaterThan(0); // Should have subdivided
  });
});
```

**Benchmark:**

```typescript
// Test with 100,000 points
const points = generateRandomPoints(100000);

// Flat array: O(n) query
console.time('Flat Array Query');
const flatResults = points.filter(p =>
  p.x >= 1000 && p.x <= 2000 && p.y >= 1000 && p.y <= 2000
);
console.timeEnd('Flat Array Query'); // ~50ms

// Quadtree: O(log n) query
console.time('Quadtree Query');
const qtResults = quadtree.queryRange(new Rect(1000, 1000, 1000, 1000));
console.timeEnd('Quadtree Query'); // ~2ms (25× faster!)
```

**Acceptance Criteria:**
- Quadtree inserts 100k points in <500ms
- Range queries 10-50× faster than linear scan
- Nearest-point search <5ms for 100k points
- Unit tests pass with 100% coverage
- No memory leaks (profiled with Chrome DevTools)

#### 3.2 Integrate Quadtree into Scan Model (3-4 days)

**Tasks:**
- [ ] Update `ContextImageScanModel` to use quadtree
- [ ] Modify `context-image-scan-model-generator.ts` to build quadtree during point processing
- [ ] Update `getClosestLocationIdxToPoint()` to use spatial query
- [ ] Keep `scanPoints` array for backward compatibility
- [ ] Add debug visualization for quadtree structure

**Implementation:**

```typescript
// client/src/app/modules/image-viewers/widgets/context-image/context-image-model-internals.ts

import { Quadtree } from '../../../utils/spatial/quadtree';

export class ContextImageScanModel {
  public scanId: string = "";
  public scanPoints: ScanPoint[] = []; // Keep for backward compat
  public scanPointsQuadtree: Quadtree<ScanPoint>; // NEW
  public scanPointPolygons: Point[][] = [];
  public clusters: PointCluster[] = [];
  public footprint: HullPoint[][] = [];
  public imageName: string = "";

  constructor() {
    // Initialize with dummy bounds, will be updated during point loading
    this.scanPointsQuadtree = new Quadtree<ScanPoint>(
      new Rect(0, 0, 10000, 10000),
      50 // Max 50 points per quadtree node
    );
  }

  // UPDATED: O(log n) instead of O(n)
  getClosestLocationIdxToPoint(worldPt: Point, maxDistance: number): number[] {
    // Use quadtree for fast spatial query
    const candidates = this.scanPointsQuadtree.findNearestN(
      worldPt,
      10,  // Return top 10 nearest
      maxDistance
    );

    // Convert to location indices and sort by distance
    return candidates
      .filter(p => p.coord !== null)
      .map(p => ({
        idx: p.locationIdx,
        dist: Point.distanceBetween(worldPt, p.coord!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .map(item => item.idx);
  }

  // NEW: Get points visible in viewport
  getPointsInViewport(viewport: Rect): ScanPoint[] {
    return this.scanPointsQuadtree.queryRange(viewport);
  }

  // NEW: Debug visualization
  getQuadtreeStats(): any {
    return this.scanPointsQuadtree.getStats();
  }
}
```

**Update Generator:**

```typescript
// client/src/app/modules/image-viewers/widgets/context-image/context-image-scan-model-generator.ts

export function processBeamData(
  scanModel: ContextImageScanModel,
  beamLocations: Coordinate2D[][],
  scanEntryMetadata: ScanEntryMetadata[],
  imageName: string
): void {
  // ... existing processing ...

  // Calculate image bounds for quadtree
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const point of scanModel.scanPoints) {
    if (point.coord) {
      minX = Math.min(minX, point.coord.x);
      minY = Math.min(minY, point.coord.y);
      maxX = Math.max(maxX, point.coord.x);
      maxY = Math.max(maxY, point.coord.y);
    }
  }

  // Add 10% padding to bounds
  const padding = Math.max(maxX - minX, maxY - minY) * 0.1;
  const bounds = new Rect(
    minX - padding,
    minY - padding,
    (maxX - minX) + padding * 2,
    (maxY - minY) + padding * 2
  );

  // Build quadtree
  console.time('Building quadtree');
  scanModel.scanPointsQuadtree = new Quadtree<ScanPoint>(bounds, 50);

  for (const point of scanModel.scanPoints) {
    if (point.coord) {
      scanModel.scanPointsQuadtree.insert(point);
    }
  }

  console.timeEnd('Building quadtree');
  console.log('Quadtree stats:', scanModel.scanPointsQuadtree.getStats());
}
```

**Acceptance Criteria:**
- Quadtree builds successfully during scan load
- Point selection uses quadtree (verify in profiler)
- Selection performance improved 10-50× for large datasets
- Backward compatibility maintained (existing code works)
- Console logs show quadtree stats on load

#### 3.3 Viewport Culling in Point Renderer (2-3 days)

**Tasks:**
- [ ] Update `draw-scan-points.ts` to accept viewport parameter
- [ ] Query quadtree for visible points only
- [ ] Skip rendering off-screen points
- [ ] Add debug overlay showing culled vs rendered points
- [ ] Performance test with 100k points

**Implementation:**

```typescript
// client/src/app/modules/image-viewers/widgets/context-image/drawlib/draw-scan-points.ts

export function drawScanPoints(
  screen: OffscreenCanvasRenderingContext2D,
  scanModel: ContextImageScanModel,
  transform: PanZoom,
  viewport: Rect,  // NEW PARAMETER
  drawParams: ScanPointsDrawParams
): void {
  // OLD: for (const scanPoint of scanModel.scanPoints)
  // NEW: Only get visible points from quadtree

  console.time('Query visible points');
  const visiblePoints = scanModel.getPointsInViewport(viewport);
  console.timeEnd('Query visible points');

  console.log(
    `Rendering ${visiblePoints.length} of ${scanModel.scanPoints.length} points ` +
    `(${((visiblePoints.length / scanModel.scanPoints.length) * 100).toFixed(1)}%)`
  );

  // Separate selected and unselected (now operating on smaller array)
  const unselectedPoints: ScanPoint[] = [];
  const selectedPoints: ScanPoint[] = [];

  for (const scanPoint of visiblePoints) {
    if (drawParams.selectedPointIndexes.has(scanPoint.locationIdx)) {
      selectedPoints.push(scanPoint);
    } else {
      unselectedPoints.push(scanPoint);
    }
  }

  // Draw unselected points (multiple passes for layered appearance)
  screen.globalAlpha = drawParams.unselectedOpacity;

  // Pass 1: Outer circles
  for (const scanPoint of unselectedPoints) {
    if (!scanPoint.coord) continue;

    const screenPos = transform.worldToCanvasSpace(scanPoint.coord);
    drawEmptyCircle(
      screen,
      screenPos,
      drawParams.unselectedRadius,
      drawParams.unselectedColour,
      drawParams.unselectedBorderWidth
    );
  }

  // Pass 2: Inner fills
  for (const scanPoint of unselectedPoints) {
    if (!scanPoint.coord) continue;

    const screenPos = transform.worldToCanvasSpace(scanPoint.coord);
    drawFilledCircle(
      screen,
      screenPos,
      drawParams.unselectedRadius - drawParams.unselectedBorderWidth,
      drawParams.unselectedFillColour
    );
  }

  screen.globalAlpha = 1.0;

  // Draw selected points (highlighted)
  for (const scanPoint of selectedPoints) {
    if (!scanPoint.coord) continue;

    const screenPos = transform.worldToCanvasSpace(scanPoint.coord);

    // Get custom colour override if exists
    const colour = drawParams.drawPointColourOverrides.get(scanPoint.PMC) ||
                   drawParams.selectedColour;

    drawFilledCircle(screen, screenPos, drawParams.selectedRadius, colour);
    drawEmptyCircle(
      screen,
      screenPos,
      drawParams.selectedRadius,
      drawParams.selectedBorderColour,
      drawParams.selectedBorderWidth
    );
  }
}
```

**Update Drawer Call:**

```typescript
// client/src/app/modules/image-viewers/widgets/context-image/context-image-drawer.ts

drawData(
  screenContext: OffscreenCanvasRenderingContext2D,
  drawParams: ContextImageDrawParams
): void {
  // Calculate world-space viewport bounds
  const canvasRect = new Rect(
    0,
    0,
    screenContext.canvas.width,
    screenContext.canvas.height
  );
  const worldViewport = drawParams.transform.canvasToWorldSpace(canvasRect);

  // Draw each scan's data
  for (const [scanId, scanDrawModel] of drawParams.drawModels) {
    // ... draw footprint, maps, regions ...

    // Draw scan points with viewport culling
    if (this._shouldDrawPoints(drawParams)) {
      drawScanPoints(
        screenContext,
        scanDrawModel,
        drawParams.transform,
        worldViewport,  // NEW
        this._getScanPointsDrawParams(drawParams, scanId)
      );
    }
  }
}
```

**Debug Overlay:**

```typescript
// Add to context-image-drawer.ts for debugging

private _drawDebugInfo(
  ctx: CanvasRenderingContext2D,
  scanModel: ContextImageScanModel,
  viewport: Rect
): void {
  if (!this._debugMode) return;

  const stats = scanModel.getQuadtreeStats();
  const visibleCount = scanModel.getPointsInViewport(viewport).length;
  const totalCount = scanModel.scanPoints.length;
  const culledPercent = ((1 - visibleCount / totalCount) * 100).toFixed(1);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 200, 100);

  ctx.fillStyle = 'lime';
  ctx.font = '12px monospace';
  ctx.fillText(`Total Points: ${totalCount}`, 20, 30);
  ctx.fillText(`Visible: ${visibleCount}`, 20, 50);
  ctx.fillText(`Culled: ${culledPercent}%`, 20, 70);
  ctx.fillText(`QT Nodes: ${stats.totalNodes}`, 20, 90);
  ctx.restore();
}
```

**Acceptance Criteria:**
- Only visible points rendered (confirmed in profiler)
- 10-100× performance improvement when zoomed in
- 60fps maintained with 100k points when zoomed to small region
- Debug overlay shows culling percentage
- No visual artifacts at viewport boundaries

#### 3.4 Level of Detail System (1 week)

**Tasks:**
- [ ] Create `ScanPointLODManager` class
- [ ] Generate LOD levels during scan load (100%, 50%, 25%, 10%, 1%)
- [ ] Integrate with zoom level calculation
- [ ] Add cluster rendering for distant views (LOD 4)
- [ ] Smooth transitions between LOD levels

**Implementation:**

```typescript
// client/src/app/modules/image-viewers/models/scan-point-lod-manager.ts

export interface LODLevel {
  level: number;
  points: ScanPoint[];
  ratio: number;
  minZoom: number;
  maxZoom: number;
}

export class ScanPointLODManager {
  private _lodLevels: Map<number, LODLevel> = new Map();
  private _clusters: PointCluster[] = [];

  constructor(allPoints: ScanPoint[], imageBounds: Rect) {
    this._generateLODLevels(allPoints, imageBounds);
  }

  private _generateLODLevels(allPoints: ScanPoint[], bounds: Rect): void {
    console.time('Generating LOD levels');

    // LOD 0: Full resolution (100%)
    this._lodLevels.set(0, {
      level: 0,
      points: allPoints,
      ratio: 1.0,
      minZoom: 6,
      maxZoom: Infinity
    });

    // LOD 1: 50% - every other point
    this._lodLevels.set(1, {
      level: 1,
      points: this._subsampleRegular(allPoints, 0.5),
      ratio: 0.5,
      minZoom: 4,
      maxZoom: 6
    });

    // LOD 2: 25% - spatial sampling for even coverage
    this._lodLevels.set(2, {
      level: 2,
      points: this._subsampleSpatial(allPoints, bounds, 0.25),
      ratio: 0.25,
      minZoom: 2,
      maxZoom: 4
    });

    // LOD 3: 10% - coarse sampling
    this._lodLevels.set(3, {
      level: 3,
      points: this._subsampleSpatial(allPoints, bounds, 0.1),
      ratio: 0.1,
      minZoom: 1,
      maxZoom: 2
    });

    // LOD 4: 1% - cluster representatives
    this._lodLevels.set(4, {
      level: 4,
      points: this._subsampleSpatial(allPoints, bounds, 0.01),
      ratio: 0.01,
      minZoom: 0,
      maxZoom: 1
    });

    // Generate clusters for LOD 4
    this._clusters = this._generateClusters(allPoints, bounds, 100);

    console.timeEnd('Generating LOD levels');

    // Log LOD stats
    this._lodLevels.forEach((lod, level) => {
      console.log(
        `LOD ${level}: ${lod.points.length} points (${(lod.ratio * 100).toFixed(1)}%)` +
        `, zoom ${lod.minZoom}-${lod.maxZoom}`
      );
    });
  }

  getPointsForZoom(zoomLevel: number): ScanPoint[] {
    for (const lod of this._lodLevels.values()) {
      if (zoomLevel >= lod.minZoom && zoomLevel < lod.maxZoom) {
        return lod.points;
      }
    }

    // Default to lowest LOD
    return this._lodLevels.get(4)!.points;
  }

  getLODLevelForZoom(zoomLevel: number): number {
    for (const lod of this._lodLevels.values()) {
      if (zoomLevel >= lod.minZoom && zoomLevel < lod.maxZoom) {
        return lod.level;
      }
    }
    return 4;
  }

  getClustersForZoom(zoomLevel: number): PointCluster[] {
    return zoomLevel < 1 ? this._clusters : [];
  }

  private _subsampleRegular(points: ScanPoint[], ratio: number): ScanPoint[] {
    const step = Math.floor(1 / ratio);
    return points.filter((_, idx) => idx % step === 0);
  }

  private _subsampleSpatial(
    points: ScanPoint[],
    bounds: Rect,
    ratio: number
  ): ScanPoint[] {
    // Grid-based spatial sampling for even coverage
    const targetCount = Math.floor(points.length * ratio);
    const gridSize = Math.ceil(Math.sqrt(points.length / targetCount));

    const cellWidth = bounds.w / gridSize;
    const cellHeight = bounds.h / gridSize;

    // Create grid
    const grid = new Map<string, ScanPoint[]>();

    for (const point of points) {
      if (!point.coord) continue;

      const cellX = Math.floor((point.coord.x - bounds.x) / cellWidth);
      const cellY = Math.floor((point.coord.y - bounds.y) / cellHeight);
      const cellKey = `${cellX},${cellY}`;

      if (!grid.has(cellKey)) {
        grid.set(cellKey, []);
      }
      grid.get(cellKey)!.push(point);
    }

    // Take one representative point from each cell
    const sampled: ScanPoint[] = [];
    for (const cellPoints of grid.values()) {
      if (cellPoints.length > 0) {
        // Take center-most point in cell
        sampled.push(this._getCenterPoint(cellPoints));
      }
    }

    return sampled;
  }

  private _getCenterPoint(points: ScanPoint[]): ScanPoint {
    // Find geometric center
    let sumX = 0, sumY = 0, count = 0;
    for (const p of points) {
      if (p.coord) {
        sumX += p.coord.x;
        sumY += p.coord.y;
        count++;
      }
    }
    const centerX = sumX / count;
    const centerY = sumY / count;

    // Find point closest to center
    let closest = points[0];
    let minDist = Infinity;
    for (const p of points) {
      if (p.coord) {
        const dist = Math.hypot(p.coord.x - centerX, p.coord.y - centerY);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }
    }

    return closest;
  }

  private _generateClusters(
    points: ScanPoint[],
    bounds: Rect,
    targetClusterCount: number
  ): PointCluster[] {
    // Simple grid-based clustering
    const gridSize = Math.ceil(Math.sqrt(targetClusterCount));
    const cellWidth = bounds.w / gridSize;
    const cellHeight = bounds.h / gridSize;

    const clusterMap = new Map<string, ScanPoint[]>();

    for (const point of points) {
      if (!point.coord) continue;

      const cellX = Math.floor((point.coord.x - bounds.x) / cellWidth);
      const cellY = Math.floor((point.coord.y - bounds.y) / cellHeight);
      const cellKey = `${cellX},${cellY}`;

      if (!clusterMap.has(cellKey)) {
        clusterMap.set(cellKey, []);
      }
      clusterMap.get(cellKey)!.push(point);
    }

    // Convert to cluster objects
    const clusters: PointCluster[] = [];
    for (const [key, clusterPoints] of clusterMap) {
      if (clusterPoints.length === 0) continue;

      // Calculate cluster center
      let sumX = 0, sumY = 0;
      for (const p of clusterPoints) {
        if (p.coord) {
          sumX += p.coord.x;
          sumY += p.coord.y;
        }
      }

      clusters.push({
        center: new Point(
          sumX / clusterPoints.length,
          sumY / clusterPoints.length
        ),
        count: clusterPoints.length,
        pointIndices: clusterPoints.map(p => p.locationIdx),
        bounds: this._calculateBounds(clusterPoints)
      });
    }

    return clusters;
  }

  private _calculateBounds(points: ScanPoint[]): Rect {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const p of points) {
      if (p.coord) {
        minX = Math.min(minX, p.coord.x);
        minY = Math.min(minY, p.coord.y);
        maxX = Math.max(maxX, p.coord.x);
        maxY = Math.max(maxY, p.coord.y);
      }
    }

    return new Rect(minX, minY, maxX - minX, maxY - minY);
  }
}
```

**Integrate into Renderer:**

```typescript
// Update draw-scan-points.ts

export function drawScanPoints(
  screen: OffscreenCanvasRenderingContext2D,
  scanModel: ContextImageScanModel,
  transform: PanZoom,
  viewport: Rect,
  zoomLevel: number,  // NEW
  drawParams: ScanPointsDrawParams
): void {
  // Get LOD-appropriate points
  const lodPoints = scanModel.lodManager.getPointsForZoom(zoomLevel);

  // Query only visible points at this LOD
  const visiblePoints = scanModel.scanPointsQuadtree.queryRange(viewport)
    .filter(p => lodPoints.includes(p)); // Filter by LOD

  console.log(
    `LOD ${scanModel.lodManager.getLODLevelForZoom(zoomLevel)}: ` +
    `Rendering ${visiblePoints.length} points`
  );

  // Check if should render clusters instead
  const clusters = scanModel.lodManager.getClustersForZoom(zoomLevel);
  if (clusters.length > 0 && zoomLevel < 1) {
    drawScanPointClusters(screen, clusters, transform, drawParams);
    return;
  }

  // ... rest of rendering as before ...
}

function drawScanPointClusters(
  screen: OffscreenCanvasRenderingContext2D,
  clusters: PointCluster[],
  transform: PanZoom,
  drawParams: ScanPointsDrawParams
): void {
  for (const cluster of clusters) {
    const screenPos = transform.worldToCanvasSpace(cluster.center);

    // Size based on cluster count (min 8px, max 30px)
    const radius = Math.min(30, Math.max(8, Math.sqrt(cluster.count) * 2));

    // Color by density
    const hue = 200 + Math.min(60, cluster.count / 10);
    const color = `hsl(${hue}, 70%, 50%)`;

    // Draw cluster circle
    drawFilledCircle(screen, screenPos, radius, color);
    drawEmptyCircle(screen, screenPos, radius, 'white', 2);

    // Draw count label
    screen.save();
    screen.fillStyle = 'white';
    screen.font = '10px Arial';
    screen.textAlign = 'center';
    screen.textBaseline = 'middle';
    screen.fillText(
      cluster.count.toString(),
      screenPos.x,
      screenPos.y
    );
    screen.restore();
  }
}
```

**Acceptance Criteria:**
- LOD levels generated correctly (5 levels: 100%, 50%, 25%, 10%, 1%)
- Zoom changes trigger appropriate LOD level
- Clusters render at distant zoom levels
- Smooth visual transitions (no popping)
- 60fps maintained at all zoom levels with 100k points

---

### Phase 4: WebGL Optimization (Optional, 2 weeks)

**Goal:** GPU-accelerated point rendering for 100k+ points

**Note:** This phase is optional but recommended for datasets with >100k points.

#### 4.1 WebGL Point Renderer (1 week)

**Tasks:**
- [ ] Create `WebGLPointRenderer` class
- [ ] Implement vertex/fragment shaders for point rendering
- [ ] Upload point positions to GPU as vertex buffer
- [ ] Support point colors and sizes
- [ ] Integrate with existing canvas overlay system

**Implementation:**

```typescript
// client/src/app/modules/image-viewers/utils/webgl-point-renderer.ts

export class WebGLPointRenderer {
  private _gl: WebGLRenderingContext;
  private _program: WebGLProgram;
  private _positionBuffer: WebGLBuffer;
  private _colorBuffer: WebGLBuffer;
  private _pointCount: number = 0;

  // Shader attribute/uniform locations
  private _aPosition: number;
  private _aColor: number;
  private _uTransform: WebGLUniformLocation;
  private _uPointSize: WebGLUniformLocation;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this._gl = gl;

    this._initShaders();
    this._initBuffers();
  }

  private _initShaders(): void {
    const vertexShaderSource = `
      attribute vec2 aPosition;
      attribute vec4 aColor;
      uniform mat3 uTransform;
      uniform float uPointSize;
      varying vec4 vColor;

      void main() {
        // Apply 2D transform
        vec3 transformed = uTransform * vec3(aPosition, 1.0);
        gl_Position = vec4(transformed.xy, 0.0, 1.0);
        gl_PointSize = uPointSize;
        vColor = aColor;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 vColor;

      void main() {
        // Render as circle (not square)
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) {
          discard;
        }

        // Soft edge
        float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
        gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
      }
    `;

    this._program = this._createProgram(vertexShaderSource, fragmentShaderSource);

    // Get attribute/uniform locations
    this._aPosition = this._gl.getAttribLocation(this._program, 'aPosition');
    this._aColor = this._gl.getAttribLocation(this._program, 'aColor');
    this._uTransform = this._gl.getUniformLocation(this._program, 'uTransform')!;
    this._uPointSize = this._gl.getUniformLocation(this._program, 'uPointSize')!;
  }

  private _initBuffers(): void {
    this._positionBuffer = this._gl.createBuffer()!;
    this._colorBuffer = this._gl.createBuffer()!;
  }

  uploadPoints(points: ScanPoint[], colors: Map<number, RGBA>): void {
    // Convert points to Float32Array for GPU
    const positions: number[] = [];
    const colorsArray: number[] = [];

    for (const point of points) {
      if (!point.coord) continue;

      positions.push(point.coord.x, point.coord.y);

      const color = colors.get(point.PMC) || { r: 255, g: 255, b: 255, a: 255 };
      colorsArray.push(
        color.r / 255,
        color.g / 255,
        color.b / 255,
        color.a / 255
      );
    }

    this._pointCount = positions.length / 2;

    // Upload to GPU
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._positionBuffer);
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      new Float32Array(positions),
      this._gl.STATIC_DRAW
    );

    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._colorBuffer);
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      new Float32Array(colorsArray),
      this._gl.STATIC_DRAW
    );
  }

  render(transform: PanZoom, viewport: Rect, pointSize: number): void {
    const gl = this._gl;

    gl.useProgram(this._program);

    // Set up transform matrix (world space → NDC)
    const transformMatrix = this._createTransformMatrix(transform, viewport);
    gl.uniformMatrix3fv(this._uTransform, false, transformMatrix);

    // Set point size
    gl.uniform1f(this._uPointSize, pointSize);

    // Bind position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.enableVertexAttribArray(this._aPosition);
    gl.vertexAttribPointer(this._aPosition, 2, gl.FLOAT, false, 0, 0);

    // Bind color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer);
    gl.enableVertexAttribArray(this._aColor);
    gl.vertexAttribPointer(this._aColor, 4, gl.FLOAT, false, 0, 0);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw all points in single call (FAST!)
    gl.drawArrays(gl.POINTS, 0, this._pointCount);

    // Cleanup
    gl.disableVertexAttribArray(this._aPosition);
    gl.disableVertexAttribArray(this._aColor);
  }

  private _createTransformMatrix(transform: PanZoom, viewport: Rect): Float32Array {
    // Convert from world space → screen space → NDC (-1 to 1)
    const scaleX = (2 * transform.scale.x) / viewport.w;
    const scaleY = (-2 * transform.scale.y) / viewport.h; // Flip Y
    const translateX = (2 * transform.pan.x) / viewport.w - 1;
    const translateY = -(2 * transform.pan.y) / viewport.h + 1;

    return new Float32Array([
      scaleX, 0, 0,
      0, scaleY, 0,
      translateX, translateY, 1
    ]);
  }

  private _createProgram(vertSource: string, fragSource: string): WebGLProgram {
    const gl = this._gl;

    const vertShader = this._compileShader(gl.VERTEX_SHADER, vertSource);
    const fragShader = this._compileShader(gl.FRAGMENT_SHADER, fragSource);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }

    return program;
  }

  private _compileShader(type: number, source: string): WebGLShader {
    const gl = this._gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  clear(): void {
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
  }

  dispose(): void {
    this._gl.deleteBuffer(this._positionBuffer);
    this._gl.deleteBuffer(this._colorBuffer);
    this._gl.deleteProgram(this._program);
  }
}
```

**Acceptance Criteria:**
- WebGL renderer draws 100k points at 60fps
- Points render as circles (not squares)
- Colors and transparency work correctly
- No visual difference from Canvas2D rendering

#### 4.2 Hybrid Canvas + WebGL System (3-4 days)

**Tasks:**
- [ ] Layer WebGL canvas under existing overlay canvas
- [ ] WebGL renders base scan points
- [ ] Canvas2D renders overlays (ROIs, lines, UI)
- [ ] Synchronize transforms between layers
- [ ] Add fallback to Canvas2D if WebGL unavailable

**Acceptance Criteria:**
- Seamless layering (user can't tell it's two canvases)
- Overlays render correctly on top of WebGL points
- Transform sync works perfectly
- Graceful degradation on old browsers

---

### Phase 5: Testing & Polish (2 weeks)

**Goal:** Ensure production readiness and smooth user experience

#### 5.1 Performance Testing (3-4 days)

**Tasks:**
- [ ] Load test with 30k×20k image (2GB TIFF)
- [ ] Load test with 500k scan points
- [ ] Memory profiling (Chrome DevTools)
- [ ] Network profiling (tile loading patterns)
- [ ] FPS monitoring during pan/zoom
- [ ] Mobile device testing (tablets)

**Test Scenarios:**
1. Initial load time (cold cache)
2. Pan across entire image
3. Zoom from 0 to max and back
4. Select individual points at various zoom levels
5. Multi-widget sync (2-4 widgets)
6. Long session (memory leaks)

**Performance Targets:**
- Initial visible render: <3s
- Pan/zoom: 60fps sustained
- Selection response: <100ms
- Memory usage: <500MB after 10min session
- Tile cache hit rate: >85%

#### 5.2 Backward Compatibility (2-3 days)

**Tasks:**
- [ ] Test with existing small images (<10 megapixels)
- [ ] Verify existing scans still work
- [ ] Check saved layouts load correctly
- [ ] Test all existing tools (pan, zoom, selection, ROI drawing)
- [ ] Verify expression maps render correctly
- [ ] Test with old browser versions (Chrome -2 versions)

**Acceptance Criteria:**
- Zero regressions on existing datasets
- Automatic fallback for small images (no tiling)
- All existing features work identically

#### 5.3 Error Handling & Edge Cases (2-3 days)

**Tasks:**
- [ ] Handle missing tiles (404) gracefully
- [ ] Handle malformed metadata
- [ ] Handle network errors during tile loading
- [ ] Handle corrupted image data
- [ ] Handle scans with zero points
- [ ] Handle extreme zoom levels (0.01× to 1000×)
- [ ] Handle very narrow/wide images (aspect ratio extremes)

**Error UX:**
- Show placeholder tiles for missing data
- Display clear error messages (not just console logs)
- Retry failed requests with exponential backoff
- Degrade gracefully (show lower-res tiles if high-res fails)

#### 5.4 Documentation & Deployment (3-4 days)

**Tasks:**
- [ ] Update CLAUDE.md with new architecture notes
- [ ] Document COG conversion process for data team
- [ ] Create migration guide for existing datasets
- [ ] Add performance tuning guide (cache sizes, LOD levels, etc.)
- [ ] Update backend API documentation
- [ ] Create troubleshooting guide

**Deliverables:**
- `docs/TILING_SYSTEM.md` - Architecture documentation
- `docs/COG_PIPELINE.md` - Image processing pipeline
- `docs/PERFORMANCE_TUNING.md` - Optimization guide
- Updated `CLAUDE.md` with new components

---

## Risk Assessment

### High Risk Items

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **COG conversion breaks multi-channel TIFFs** | High | Medium | Test with sample 4-channel TIFFs early; may need custom tiling solution |
| **WebGL compatibility issues** | Medium | Low | Canvas2D fallback; test on target devices |
| **Backend tile server performance** | High | Medium | Implement aggressive caching (Redis); use CDN |
| **Quadtree breaks existing selection logic** | Medium | Low | Comprehensive unit tests; keep flat array for backward compat |
| **Memory leaks in tile cache** | High | Medium | Strict LRU eviction; memory profiling in CI |

### Medium Risk Items

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **LOD transitions cause visual popping** | Low | High | Implement smooth blending between LOD levels |
| **Tile loading order causes flashing** | Low | High | Priority queue + progressive loading |
| **Large code refactor introduces bugs** | Medium | High | Incremental rollout; feature flags; extensive testing |
| **User confusion with new behavior** | Low | Medium | Clear loading indicators; tooltips; documentation |

---

## Success Metrics

### Technical Metrics

✅ **Performance:**
- 60fps pan/zoom with 100k+ points
- <3s initial load for 2GB images
- <100ms point selection response
- <500MB client memory usage

✅ **Scalability:**
- Support 30k × 20k pixel images (600MP)
- Support 1M+ scan points per dataset
- Tile cache hit rate >85%
- Backend tile response time <100ms

✅ **Reliability:**
- Zero regressions on existing datasets
- Graceful degradation on errors
- No memory leaks after 1hr session

### User Experience Metrics

✅ **Usability:**
- Smooth zoom (no stuttering)
- Responsive selection
- Clear loading indicators
- No visual artifacts

✅ **Adoption:**
- Earth geologists successfully use system
- No reported performance complaints
- Positive feedback on responsiveness

---

## Timeline Summary

| Phase | Duration | Dependencies | Risk Level |
|-------|----------|--------------|------------|
| **Phase 1: Backend Tiling** | 3-4 weeks | None | High |
| **Phase 2: Frontend Tiles** | 3-4 weeks | Phase 1 | Medium |
| **Phase 3: Point Optimization** | 3 weeks | None (parallel) | Low |
| **Phase 4: WebGL** (optional) | 2 weeks | Phase 3 | Medium |
| **Phase 5: Testing & Polish** | 2 weeks | All above | Low |

**Total Duration:** 13-15 weeks (3-4 months)
**With WebGL:** 15-17 weeks (4 months)

### Parallel Work Opportunities

- Phase 1 (Backend) and Phase 3 (Quadtree) can run in parallel
- Different developers can work on image tiling vs point optimization
- Testing can start as soon as Phase 1 completes (backend tiles ready)

---

## Next Steps

### Immediate Actions (Week 1)

1. ✅ **Approve roadmap** - Review and sign off on approach
2. ✅ **Set up dev environment** - Install GDAL, set up test images
3. ✅ **Create test dataset** - Generate sample 30k×20k TIFF with 100k points
4. ✅ **Spike: COG conversion** - Test GDAL pipeline with real PIXLISE TIFFs
5. ✅ **Spike: Quadtree prototype** - Validate performance improvements

### Sprint 1 (Weeks 2-3)

- Implement COG pipeline (Phase 1.1)
- Create tile server API (Phase 1.2)
- Begin quadtree implementation (Phase 3.1)

### Sprint 2 (Weeks 4-5)

- RGBU multi-channel tiling (Phase 1.3)
- TileLoaderService frontend (Phase 2.1)
- Integrate quadtree into scan model (Phase 3.2)

---

## Appendix

### Recommended Tools & Libraries

**Backend:**
- GDAL 3.x - Image processing and COG generation
- Go `geotiff` library - Tile extraction
- Redis - Tile caching
- CDN (CloudFront/Cloudflare) - Tile delivery

**Frontend:**
- RxJS - Async tile loading
- IndexedDB - Client-side tile cache
- OffscreenCanvas - Background rendering
- WebGL - GPU point rendering (optional)

**Alternative:** Consider Leaflet or OpenLayers instead of building tile system from scratch

### References

- [Cloud Optimized GeoTIFF Spec](https://www.cogeo.org/)
- [GDAL COG Driver](https://gdal.org/drivers/raster/cog.html)
- [Quadtree Wikipedia](https://en.wikipedia.org/wiki/Quadtree)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [OpenLayers Documentation](https://openlayers.org/)

---

**Document Status:** Draft v1.0
**Last Updated:** 2025-11-11
**Next Review:** After Phase 1 completion
