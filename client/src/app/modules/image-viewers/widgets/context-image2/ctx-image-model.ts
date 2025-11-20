import { Subject } from "rxjs";
import { ContextImage2DrawModel } from "./ctx-image-draw-model";

export class ContextImage2Model {
  needsDraw$: Subject<void> = new Subject<void>();
  drawModel = new ContextImage2DrawModel();

  setData() {
    this.drawModel.create();    
  }
}