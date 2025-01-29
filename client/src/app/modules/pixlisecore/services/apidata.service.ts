import { EventEmitter, Injectable, OnDestroy } from "@angular/core";

import { APICommService } from "./apicomm.service";

import { ResponseStatus, WSMessage } from "../../../generated-protos/websocket";
import { getMessageName, WSError, WSMessageHandler, WSOustandingReq } from "./wsMessageHandler";
import { randomString } from "src/app/utils/utils";

import * as _m0 from "protobufjs/minimal";
import { Subject, Subscription, interval } from "rxjs";
import { environment } from "src/environments/environment";

const TIMEOUT_CHECK_INTERVAL_MS = 3000;
const MESSAGE_TIMEOUT_MS = environment.wsTimeout;

@Injectable({
  providedIn: "root",
})
export class APIDataService extends WSMessageHandler implements OnDestroy {
  private _subs = new Subscription();

  private _id = randomString(6);

  outstandingRequests$: Subject<string> = new Subject<string>();
  private _lastOutstandingRequestInfo = "";

  // Generating message IDs:
  // These are what we send up, API generates reply with same ID in it to specify what it's replying to. This can be
  // any number, and we can re-send a request and expect a reply to it (even after a reconnection - id sequence
  // doesnt have to restart). If it overflows MAX_INT, it loops around, that's ok! We just make sure our counter
  // also restarts at MAX_INT
  private _lastMsgId = 1;

  protected nextMsgId() {
    this._lastMsgId++;
    if (this._lastMsgId > 2147483647) {
      this._lastMsgId = 0;
    }
    return this._lastMsgId;
  }

  constructor(private _apiComms: APICommService) {
    super();
    console.log(`APIDataService [${this._id}] created`);

    this.connect();
  }

  ngOnDestroy() {
    this.stopTimeoutChecks();
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

          this.stopTimeoutChecks();
        },
        complete: () => {
          console.log(`APIDataService [${this._id}] connect received complete event`); // Called when connection is closed (for whatever reason).
          // At this point we have to clear subscriptions or something...

          this.stopTimeoutChecks();
        },
      });
  }

  private stopTimeoutChecks() {
    this._subs.unsubscribe();
  }

  private onConnected() {
    // Find all outstanding requests. NOTE we send the spectrum requests last, because they might be sitting around a while
    // but any other message would make the UI more responsive
    const reqs = [];
    for (const outstanding of this._outstandingRequests.values()) {
      if (outstanding.req.spectrumReq === undefined) {
        reqs.push(outstanding.req);
        outstanding.resetCreateTime(); // Reset its creation time because we're about to send it to our new connection!
      }
    }

    for (const outstanding of this._outstandingRequests.values()) {
      if (outstanding.req.spectrumReq !== undefined) {
        reqs.push(outstanding.req);
        outstanding.resetCreateTime(); // Reset its creation time because we're about to send it to our new connection!
      }
    }

    this.updateOutstandingInfo();

    console.log(`APIDataService [${this._id}] onConnected, flushing send queue of ${reqs.length} items`);

    // Send everything in the queue
    // TODO: Should this be in random order? That way on repeated disconnection we eventually whittle down
    // to which message is causing issues
    for (const msg of reqs) {
      this._apiComms.send(msg);
    }

    // Start a timeout checking mechanism
    this._subs.add(
      interval(TIMEOUT_CHECK_INTERVAL_MS).subscribe(() => {
        this.checkTimeouts();
      })
    );
  }

  protected sendRequest(wsmsg: WSMessage, subj: Subject<any>): void {
    wsmsg.msgId = this.nextMsgId();
    this._outstandingRequests.set(wsmsg.msgId, new WSOustandingReq(wsmsg, subj));
    this.updateOutstandingInfo();

    // If we're not yet connected, queue this up
    if (!this._apiComms.isConnected) {
      const jsonMsg = WSMessage.toJSON(wsmsg);
      console.log(`APIDataService [${this._id}] sendRequest while not yet connected. Queued up: ${JSON.stringify(jsonMsg)}`);
      return;
    }

    this._apiComms.send(wsmsg);
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
      this.updateOutstandingInfo();
    }
  }

  private checkTimeouts() {
    if (!this._apiComms.isConnected) {
      this.stopTimeoutChecks();
      return;
    }

    const tooOld = performance.now() - MESSAGE_TIMEOUT_MS;

    for (const req of this._outstandingRequests.values()) {
      if (req.createTime < tooOld) {
        // This has timed out, error out or retry or something
        req.sub.error(new WSError(ResponseStatus.WS_TIMEOUT, "Request timed out for: " + getMessageName(req.req), "Try reloading the PIXLISE tab"));
      }
    }
  }

  private updateOutstandingInfo() {
    let msg = "";
    if (this._outstandingRequests.size > 0) {
      let msgCount = 0;
      let spectrumCount = 0;

      for (const req of this._outstandingRequests.values()) {
        if (req.req.spectrumReq) {
          spectrumCount++;
        } else {
          msgCount++;
        }
      }

      if (msgCount > 0 || spectrumCount > 0) {
        msg += "Waiting for: ";
      }

      if (msgCount > 0) {
        msg += `${msgCount} requests`;
      }
      if (spectrumCount > 0) {
        if (msgCount > 0) {
          msg += ", ";
        }
        msg += `${spectrumCount} spectrum requests`;
      }
    }

    if (msg != this._lastOutstandingRequestInfo) {
      this.outstandingRequests$.next(msg);
      this._lastOutstandingRequestInfo = msg;
    }
  }
}
