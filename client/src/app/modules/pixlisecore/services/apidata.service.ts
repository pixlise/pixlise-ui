import { Injectable } from "@angular/core";

import { APICommService } from "./apicomm.service";
import { Subject, ReplaySubject, BehaviorSubject, Observable } from "rxjs";

import { WSMessage } from "../../../generated-protos/websocket";
import { WSMessageHandler } from "./wsMessageHandler";
import { randomString } from "src/app/utils/utils";

import * as _m0 from "protobufjs/minimal";

@Injectable({
  providedIn: "root",
})
export class APIDataService extends WSMessageHandler {
  private _sendQueue: WSMessage[] = [];
  private _isConnected = false;

  private _id = randomString(6);

  constructor(private _apiComms: APICommService) {
    super();
    console.log(`APIDataService [${this._id}] created`);
    this.connect();
  }

  private connect() {
    this._apiComms
      .connect(() => {
        this.onConnected();
      })
      .subscribe({
        next: (wsmsg: WSMessage) => {
          this.dispatchMessage(wsmsg);
        },
        error: err => {
          console.log(err); // Called if at any point WebSocket API signals some kind of error.
          // Not sure what we should do at this point...
        },
        complete: () => {
          console.log(`APIDataService [${this._id}] connect received complete event`); // Called when connection is closed (for whatever reason).
          // At this point we have to clear subscriptions or something...
        },
      });
  }

  private onConnected() {
    console.log(`APIDataService [${this._id}] onConnected, flushing send queue of ${this._sendQueue.length} items`);
    this._isConnected = true;

    // Send everything in the queue
    for (const msg of this._sendQueue) {
      this._apiComms.send(msg);
    }

    this._sendQueue = [];
    /*
        // We're connected, request user details
        let req = WSMessage.create({userDetailsReq: UserDetailsReq.create()});
        this.sendRequest(req);
*/
  }

  protected sendRequest(wsmsg: WSMessage): void {
    // If we're not yet connected, queue this up
    if (!this._isConnected) {
      const jsonMsg = WSMessage.toJSON(wsmsg);
      console.log(`APIDataService [${this._id}] sendRequest while not yet connected. Queued up: ${JSON.stringify(jsonMsg)}`);
      this._sendQueue.push(wsmsg);
    } else {
      this._apiComms.send(wsmsg);
    }
  }

  private dispatchMessage(wsmsg: WSMessage) {
    // Try to dispatch it as if it were a response. If this fails, we pass it to the appropriate
    // upd subject
    if (!this.dispatchResponse(wsmsg)) {
      if (!this.dispatchUpdate(wsmsg)) {
        console.error(`APIDataService [${this._id}] Failed to dispatch message: ` + JSON.stringify(WSMessage.toJSON(wsmsg), null, 4));
      }
    }
  }
}
/*
export function mapArrayBufferToProto<T extends { decode: (input: _m0.Reader | Uint8Array, length?: number)=>T}>(buf: ArrayBuffer, msg: T): T
{
    const arr = new Uint8Array(buf);
    const res = msg.decode(arr);
    return res; 
}
*/
