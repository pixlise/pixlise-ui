import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Scan3DToolId, Scan3DToolBase, Scan3DToolHost } from "./base";

export class OrbitTool extends Scan3DToolBase {
  private _mouseMoved = false;

  constructor(host: Scan3DToolHost, protected _controls?: OrbitControls) {
    super(host, Scan3DToolId.ORBIT);
  }

  onMouseDown(event: MouseEvent): void {
    this._mouseMoved = false;
  }

  onMouseMove(event: MouseEvent): void {
    this._mouseMoved = true;
  }

  onMouseUp(event: MouseEvent): void {
    // We're only interested in mouse clicks not drags
    if (this._mouseMoved) {
      return;
    }

  }
}