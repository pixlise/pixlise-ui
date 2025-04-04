import { Injectable, OnDestroy } from "@angular/core";

import { APICommService } from "./apicomm.service";

import { ResponseStatus, WSMessage } from "../../../generated-protos/websocket";
import { getMessageName, WSError, WSMessageHandler, WSOustandingReq } from "./wsMessageHandler";
import { randomString } from "src/app/utils/utils";

import * as _m0 from "protobufjs/minimal";
import { Subject, Subscription, interval } from "rxjs";
import { environment } from "src/environments/environment";

const TIMEOUT_CHECK_INTERVAL_MS = 3000;
const MESSAGE_TIMEOUT_MS = environment.wsTimeout;
const MAX_OUTSTANDING_REQ = environment.maxOutstandingAPIRequests;

@Injectable({
  providedIn: "root",
})
export class APIDataService extends WSMessageHandler implements OnDestroy {
  private _subs = new Subscription();

  private _id = randomString(6);

  outstandingRequests$: Subject<string> = new Subject<string>();
  private _lastOutstandingRequestInfo = "";

  // These are requests we haven't sent yet, because we have too many outstanding requests to the server anyway
  private _queuedRequests: Map<number, WSOustandingReq> = new Map<number, WSOustandingReq>();

  // Generating message IDs:
  // These are what we send up, API generates reply with same ID in it to specify what it's replying to. This can be
  // any number, and we can re-send a request and expect a reply to it (even after a reconnection - id sequence
  // doesnt have to restart). If it overflows MAX_INT, it loops around, that's ok! We just make sure our counter
  // also restarts at MAX_INT
  private _lastMsgId = 0;

  protected nextMsgId() {
    this._lastMsgId++;
    if (this._lastMsgId > 2147483647) {
      this._lastMsgId = 0;
    }
    return this._lastMsgId;
  }

  constructor(private _apiComms: APICommService) {
    super();
    console.debug(`APIDataService [${this._id}] created`);

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
    // Resend any outstanding requests...
    const reqs = [];
    for (const outstanding of this._outstandingRequests.values()) {
      reqs.push(outstanding.req);
      outstanding.resetCreateTime(); // Reset its creation time because we're about to send it to our new connection!
    }

    console.log(`APIDataService [${this._id}] onConnected, flushing send queue of ${reqs.length} items`);

    // Send everything in the queue
    // TODO: Should this be in random order? That way on repeated disconnection we eventually whittle down
    // to which message is causing issues
    for (const msg of reqs) {
      this._apiComms.send(msg);
    }

    // If there were less than the outstanding limit, send that many queued messages
    if (reqs.length < MAX_OUTSTANDING_REQ) {
      let toSend = MAX_OUTSTANDING_REQ - reqs.length; // The max we can send

      // Work out how many we actually have to send
      if (this._queuedRequests.size < toSend) {
        toSend = this._queuedRequests.size;
      }

      if (toSend > 0) {
        console.log(`APIDataService [${this._id}] sending ${toSend} more messages to fill outstanding requests`);
        for (let c = 0; c < toSend; c++) {
          this.sendNextQueuedMsg();
        }
      }
    }

    this.updateOutstandingInfo();

    // Start a timeout checking mechanism
    this._subs.add(
      interval(TIMEOUT_CHECK_INTERVAL_MS).subscribe(() => {
        this.checkTimeouts();
      })
    );
  }

  protected sendRequest(wsmsg: WSMessage, subj: Subject<any>): void {
    // Generate next message ID
    wsmsg.msgId = this.nextMsgId();

    // Queue the message...
    this._queuedRequests.set(wsmsg.msgId, new WSOustandingReq(wsmsg, subj));

    // Print out a complaint if we're not yet connected
    if (!this._apiComms.isConnected) {
      // SO we have some logs of what's queued up...
      const jsonMsg = WSMessage.toJSON(wsmsg);
      console.log(`APIDataService [${this._id}] sendRequest while not yet connected. Queued up: ${JSON.stringify(jsonMsg)}`);
      return;
    }

    // Call the standard send next message, it will select what's highest priority to send
    this.sendNextQueuedMsg();
    this.updateOutstandingInfo();
  }

  private sendNextQueuedMsg() {
    if (!this._apiComms.isConnected) {
      return;
    }

    if (this._queuedRequests.size <= 0) {
      return;
    }

    if (this._outstandingRequests.size >= MAX_OUTSTANDING_REQ) {
      console.warn(`sendNextQueuedMsg: ${this._outstandingRequests.size} msgs already, not sending more...`);
      return;
    }

    // If we have any non-spectrum requests, send those first
    let reqSend: WSOustandingReq | undefined = undefined;

    for (const req of this._queuedRequests.values()) {
      if (!req.req.spectrumReq) {
        reqSend = req;
        this._queuedRequests.delete(reqSend.req.msgId);
        console.debug(`sendNextQueuedMsg: Selected non-spectrum ${reqSend.req.msgId}`);
        break;
      }
    }

    if (!reqSend) {
      reqSend = this._queuedRequests.values().next().value;
      if (reqSend) {
        console.debug(`sendNextQueuedMsg: Selected spectrum ${reqSend.req.msgId}`);
        this._queuedRequests.delete(reqSend.req.msgId);
      }
    }

    if (!reqSend) {
      console.warn(`sendNextQueuedMsg: Nothing to send!`);
      return;
    }

    // We're connected, see if there's anything to queue up
    this._outstandingRequests.set(reqSend?.req.msgId, reqSend);
    this._apiComms.send(reqSend.req);

    // TODO: ensure updateOutstandingInfo(); is called! Not calling it here because we might be called in a loop!
  }

  private dispatchMessage(wsmsg: WSMessage) {
    // Try to dispatch it as if it were a response. If this fails, we pass it to the appropriate
    // upd subject
    if (!this.dispatchResponse(wsmsg)) {
      if (!this.dispatchUpdate(wsmsg)) {
        console.error(`APIDataService [${this._id}] Failed to dispatch message: ` + JSON.stringify(WSMessage.toJSON(wsmsg), null, 4));
      }
    } else {
      console.debug("<--Recd for msgId:" + wsmsg.msgId);
    }

    // Send another message if we have one queued up
    this.sendNextQueuedMsg();
    this.updateOutstandingInfo();
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
    const msgs: string[] = [];

    if (this._queuedRequests.size > 0) {
      msgs.push(`${this._queuedRequests.size} queued`);
    }

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

      if (msgCount > 0) {
        msgs.push(`${msgCount} requests`);
      }
      if (spectrumCount > 0) {
        msgs.push(`${spectrumCount} spectrum requests`);
      }
    }

    let msg = "";
    if (msgs.length > 0) {
      msg = "Waiting for: " + msgs.join(", ");
    }

    // Only update if this message is any different
    if (msg != this._lastOutstandingRequestInfo) {
      this.outstandingRequests$.next(msg);
      this._lastOutstandingRequestInfo = msg;
    }
  }
}
