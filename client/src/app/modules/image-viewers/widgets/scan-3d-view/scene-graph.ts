import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, signal } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { NgtsOrbitControls } from 'angular-three-soba/controls';

@Component({
  selector: 'app-scene-graph',
  standalone: true,
  template: `
    <ngt-color *args="[backgroundColor()]" attach="background" />
    <ngt-ambient-light [intensity]="0.8" />
    <ngt-point-light [intensity]="Math.PI" [decay]="0" [position]="[0, 6, 0]" />

    <ngt-mesh>
      <ngt-box-geometry />
      <ngt-group [position]="[0, -1, 0]">
        <ngt-grid-helper *args="[10, 20]" />
      </ngt-group>
    </ngt-mesh>

    <ngts-orbit-controls [options]="{ makeDefault: true, autoRotate: false }" />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtArgs, NgtsOrbitControls],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneGraph {
	Math = Math;
	backgroundColor = signal('#303030');
}