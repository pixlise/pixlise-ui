import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { beforeRender } from 'angular-three';
import { NgtArgs } from 'angular-three';
import { NgtsOrbitControls } from 'angular-three-soba/controls';
//import { NgtsPointMaterial } from 'angular-three-soba/materials';
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
		
		<ngt-group>
			<ngt-grid-helper *args="[10, 20]" />
				<ngts-points-buffer [positions]="pts" [stride]="3" [options]="{ frustumCulled: false }">
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

		<ngts-orbit-controls [options]="{ enableZoom: false, enablePan: false }" />
	`,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [NgtArgs, NgtsPointsBuffer, /*NgtsPointMaterial,*/ NgtsOrbitControls],
})
export class SceneGraph {
	protected readonly Math = Math;
	protected pts = new Float32Array([]); //random.inSphere(new Float32Array(5000), { radius: 1.5 }) as Float32Array;

	private pointsBufferRef = viewChild.required(NgtsPointsBuffer);

	constructor(
		private _cacheDataService: APICachedDataService,
		private _analysisLayoutService: AnalysisLayoutService
	) {
		const scanId = this._analysisLayoutService.defaultScanId;
		this._cacheDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId: scanId })).subscribe(
			(resp: ScanBeamLocationsResp) => {
				const locs: number[] = [];
				
				const scale = 1;
				for (const loc of resp.beamLocations) {
					if (loc.x != 0 && loc.y != 0 && loc.z != 0) {
						locs.push(loc.x * scale);
						locs.push(loc.y * scale);
						locs.push(loc.z * scale);
					}
				}

				//this.pts = new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12]);
				this.pts = new Float32Array(locs);
			}
		);
		//this.pts = new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12]);

		beforeRender(({ delta }) => {
			const points = this.pointsBufferRef().pointsRef()?.nativeElement;
			if (points) {
				points.rotation.x -= delta / 10;
				points.rotation.y -= delta / 15;
			}
		});
	}
}