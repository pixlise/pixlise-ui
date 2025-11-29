import { Observable, switchMap } from "rxjs";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import * as THREE from 'three';
import { loadTexture } from "../scan-3d-view/pmc-mesh";

export class TileLoader {
    constructor(private _endpointService: APIEndpointsService, private _imageName: string) {}

    loadTile(layer: number, x: number, y: number): Observable<THREE.Texture> {
        const url = `${this._imageName}?layer=${layer},x=${x},y=${y}`;
        return this._endpointService.loadImageForPath(url).pipe(
            switchMap(img => {
                return loadTexture(img);
            })
        );
    }
}