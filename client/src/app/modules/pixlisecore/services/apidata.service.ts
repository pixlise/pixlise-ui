import { Injectable } from "@angular/core";

import { APICommService } from "./apicomm.service";
import { Subject, ReplaySubject, BehaviorSubject, Observable } from "rxjs";

import { WSMessage } from "../../../generated-protos/websocket";
import { WSMessageHandler } from "./wsMessageHandler";

import * as _m0 from "protobufjs/minimal";

@Injectable({
  providedIn: "root",
})
export class APIDataService extends WSMessageHandler {
  private _sendQueue: WSMessage[] = [];
  private _isConnected = false;

  constructor(private _apiComms: APICommService) {
    super();
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
          console.log("complete"); // Called when connection is closed (for whatever reason).
          // At this point we have to clear subscriptions or something...
        },
      });
  }

  private onConnected() {
    this._isConnected = true;

    // Send everything in the queue
    for (let msg of this._sendQueue) {
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
        console.error("Failed to dispatch message: " + JSON.stringify(WSMessage.toJSON(wsmsg), null, 4));
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
