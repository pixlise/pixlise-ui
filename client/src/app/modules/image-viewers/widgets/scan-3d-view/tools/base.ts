import { IconButtonState } from "src/app/modules/pixlisecore/components/atoms/buttons/icon-button/icon-button.component";

export enum Scan3DToolId {
  ORBIT,
  MOVE_LIGHT,
  HEIGHT_PLANE,
}

export abstract class Scan3DToolHost {
}

export abstract class Scan3DToolBase {
  constructor(private _host: Scan3DToolHost, private _id: Scan3DToolId) {
    
  }

  get toolId(): Scan3DToolId { return this._id; }
  get icon(): Scan3DToolId { return this._id; }
  get state(): Scan3DToolId { return this._id; }

  abstract onMouseDown(event: MouseEvent): void;
  abstract onMouseMove(event: MouseEvent): void;
  abstract onMouseUp(event: MouseEvent): void;

  activate() {}
  deactivate() {}
}
