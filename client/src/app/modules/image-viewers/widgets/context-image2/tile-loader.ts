import { Observable, switchMap, tap } from "rxjs";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import * as THREE from 'three';
import { loadTexture } from "../scan-3d-view/pmc-mesh";

export class TileImageLoader {
    private _tileCache = new Map<string, THREE.Texture>();

    constructor(
        private _endpointService: APIEndpointsService,
        private _imageName: string
    ) {}

    getCachedTile(layer: number, x: number, y: number): THREE.Texture | undefined {
        let url = this._imageName + `?layer=${layer}&tilex=${x}&tiley=${y}`;
        return this._tileCache.get(url);
    }

    loadTileImage(layer?: number, x?: number, y?: number): Observable<THREE.Texture> {
        let url = this._imageName;
        
        if (layer !== undefined && x !== undefined && y !== undefined) {
            url += `?layer=${layer}&tilex=${x}&tiley=${y}`;
        }

        return this._endpointService.loadImageForPath(url).pipe(
            switchMap(img => {
                return loadTexture(img);
            }),
            tap(texture => {
                this._tileCache.set(url, texture);
            })
        );
    }
}