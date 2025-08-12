import { Scan3DToolId, Scan3DToolBase, Scan3DToolHost } from "./base";
import * as THREE from 'three';

export class HeightPlaneTool extends Scan3DToolBase {
  constructor(host: Scan3DToolHost) {
    super(host, Scan3DToolId.HEIGHT_PLANE);
  }

  onMouseDown(event: MouseEvent): void {

  }

  onMouseMove(event: MouseEvent): void {

  }

  onMouseUp(event: MouseEvent): void {

  }
}