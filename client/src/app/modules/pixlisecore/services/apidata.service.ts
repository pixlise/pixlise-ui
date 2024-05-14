import { Injectable } from "@angular/core";

import { APICommService } from "./apicomm.service";

import { WSMessage } from "../../../generated-protos/websocket";
import { WSMessageHandler } from "./wsMessageHandler";
import { randomString } from "src/app/utils/utils";

import * as _m0 from "protobufjs/minimal";

@Injectable({
  providedIn: "root",
})
export class APIDataService extends WSMessageHandler {
  private _isConnected = false;

  private _id = randomString(6);

  constructor(private _apiComms: APICommService) {
    super();
    console.log(`APIDataService [${this._id}] created`);

    if (this._apiComms.initialised) {
      // Only auto-connect if the layer below us is happy. This is just to prevent putting another
      // reference in here to SnackbarService really...
      this.connect();
    }
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
          console.error("APIDataService connect error:");
          console.error(err); // Called if at any point WebSocket API signals some kind of error.
          // Not sure what we should do at this point...
        },
        complete: () => {
          console.log(`APIDataService [${this._id}] connect received complete event`); // Called when connection is closed (for whatever reason).
          // At this point we have to clear subscriptions or something...
        },
      });
  }

  private onConnected() {
    // Find all outstanding requests
    const reqs = [];
    for (const outstanding of this._outstandingRequests.values()) {
      reqs.push(outstanding.req);
    }

    console.log(`APIDataService [${this._id}] onConnected, flushing send queue of ${reqs.length} items`);
    this._isConnected = true;

    // Send everything in the queue
    for (const msg of reqs) {
      this._apiComms.send(msg);
    }
  }

  protected sendRequest(wsmsg: WSMessage): void {
    // If we're not yet connected, queue this up
    if (!this._isConnected) {
      const jsonMsg = WSMessage.toJSON(wsmsg);
      console.log(`APIDataService [${this._id}] sendRequest while not yet connected. Queued up: ${JSON.stringify(jsonMsg)}`);
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
    } else {
      console.log("<--Recd for msgId:" + wsmsg.msgId);
    }
  }
}
