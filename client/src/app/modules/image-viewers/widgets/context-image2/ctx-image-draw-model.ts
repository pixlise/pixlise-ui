import * as THREE from 'three';
import { RenderData } from '../scan-3d-view/interactive-canvas-3d.component';

export class ContextImage2DrawModel {
  protected _sceneAttachment?: THREE.Object3D;
  protected _imageTiles?: THREE.Mesh;

  renderData: RenderData;

  constructor() {
    this.renderData = new RenderData(new THREE.Scene(), new THREE.PerspectiveCamera());
  }
  
  create() {
    this._sceneAttachment = new THREE.Object3D();
    this._sceneAttachment.rotation.x = -Math.PI/2;

    this._imageTiles = new THREE.Mesh(
        new THREE.BoxGeometry(
        2,
        3,
        4,
        1, 1, 1),
        new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.4,0.1,0.1),
        })
    );
    this._imageTiles.position.setZ(-10);

    // Attach tiles to the scene
    if (this._imageTiles) {
        this._sceneAttachment.add(this._imageTiles);
    }

    this.renderData.scene.add(this._sceneAttachment);
  }
}