import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, viewChild, signal, WritableSignal } from '@angular/core';
import { beforeRender, Signal } from 'angular-three';
import { NgtArgs } from 'angular-three';
import { NgtsOrbitControls } from 'angular-three-soba/controls';
import { NgtsPointMaterial } from 'angular-three-soba/materials';
import { NgtsPointsBuffer } from 'angular-three-soba/performances';
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from 'src/app/generated-protos/scan-beam-location-msgs';
import { AnalysisLayoutService, APICachedDataService } from 'src/app/modules/pixlisecore/pixlisecore.module';
//import { random } from 'maath';

@Component({
  selector: 'app-scene-graph',
  standalone: true,
	template: `
		<!-- <ngt-group [position]="[0, -1, 0]">
			<ngt-grid-helper *args="[10, 20]" />
		</ngt-group> -->
		
		@if(loaded) {
			<ngt-group>
				<ngt-grid-helper *args="[10, 20]" />
					<ngts-points-buffer [positions]="ptsSig()" [stride]="3" [options]="{ frustumCulled: false }">
						<!-- <ngts-point-material
							[options]="{
								transparent: true,
								color: '#ccc',
								size: 0.005,
								sizeAttenuation: true,
								depthWrite: false,
							}"
						/> -->
					</ngts-points-buffer>
			</ngt-group>
		}

		<ngts-orbit-controls [options]="{ enableZoom: true, enablePan: false }" />
	`,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [NgtArgs, NgtsPointsBuffer, NgtsPointMaterial, NgtsOrbitControls],
})
export class SceneGraph {
	protected readonly Math = Math;
	//protected pts = new Float32Array(); //random.inSphere(new Float32Array(5000), { radius: 1.5 }) as Float32Array;
	ptsSig: WritableSignal<Float32Array>;
	loaded = signal(false);

	// private pointsBufferRef = viewChild.required(NgtsPointsBuffer);

	constructor(
		private _cacheDataService: APICachedDataService,
		private _analysisLayoutService: AnalysisLayoutService
	) {
		const ptsInitialArry: number[] = [];
		for (let c = 0; c < 7017; c++) {
			ptsInitialArry.push(0);
		}
		ptsInitialArry[0] = 1;
		ptsInitialArry[1] = 1;
		ptsInitialArry[2] = 1;

		const ptsInitial = new Float32Array(ptsInitialArry)
		this.ptsSig = signal(ptsInitial);

		const scanId = this._analysisLayoutService.defaultScanId;
		this._cacheDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId: scanId })).subscribe(
			(resp: ScanBeamLocationsResp) => {
				const locs: number[] = [];
				
				const scale = 1000;

				const offset = [0, 0, 0];
				for (const loc of resp.beamLocations) {
					if (loc.x != 0 && loc.y != 0 && loc.z != 0) {
						offset[0] = loc.x;
						offset[1] = loc.y;
						offset[2] = loc.z;
						break;
					}
				}

				for (const loc of resp.beamLocations) {
					if (loc.x != 0 && loc.y != 0 && loc.z != 0) {
						locs.push((loc.x-offset[0]) * scale);
						locs.push((loc.z-offset[2]) * scale);
						locs.push((loc.y-offset[1]) * scale);
					}
				}

				//this.pts = new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12]);
				const pts = new Float32Array(locs);
				this.ptsSig.set(pts);
				this.loaded.set(true);
			}
		);
		// this.pts = new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12]);
		// this.ptsSig.set(this.pts);

		// beforeRender(({ delta }) => {
		// 	const points = this.pointsBufferRef().pointsRef()?.nativeElement;
		// 	if (points) {
		// 		points.rotation.x -= delta / 10;
		// 		points.rotation.y -= delta / 15;
		// 	}
		// });
	}
}