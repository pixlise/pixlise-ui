import { Scan3DToolId, Scan3DToolBase, Scan3DToolHost } from "./base";
import * as THREE from 'three';

export class MoveObjectTool extends Scan3DToolBase {
  constructor(host: Scan3DToolHost, protected _object?: THREE.Object3D) {
    super(host, Scan3DToolId.MOVE_LIGHT);
  }

  onMouseDown(event: MouseEvent): void {

  }

  onMouseMove(event: MouseEvent): void {

  }

  onMouseUp(event: MouseEvent): void {

  }
}