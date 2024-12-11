import { Injectable, OnDestroy } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { webSocket, WebSocketSubject } from "rxjs/webSocket";

import { Observable, switchMap, map, retry, catchError } from "rxjs";

import { environment } from "src/environments/environment";

import { WSMessage } from "../../../generated-protos/websocket";
import { BeginWSConnectionResponse } from "../../../generated-protos/restmsgs";
import { APIPaths } from "src/app/utils/api-helpers";
import { SentryHelper, isFirefox, randomString, rawProtoMessageToDebugString } from "src/app/utils/utils";
import { getMessageName } from "./wsMessageHandler";

import * as Sentry from "@sentry/browser";
import { CustomAuthService as AuthService } from "src/app/services/custom-auth-service.service";
import { User } from "@auth0/auth0-angular";
import { SnackbarService } from "./snackbar.service";

@Injectable({
  providedIn: "root",
})
export class APICommService implements OnDestroy {
  connection$: WebSocketSubject<any> | null = null;
  WS_RETRY_ATTEMPTS = 100;
  WS_RETRY_DELAY_MS = 5000;

  private _id = randomString(6);

  public isConnected = false;

  private _connectTime: number = 0;

  constructor(
    private http: HttpClient,
    private _authService: AuthService,
    private _snackService: SnackbarService
  ) {
    console.log(`APICommService [${this._id}] created`);

    this._authService.user$.subscribe((user: undefined | null | User) => {
      // Once we have user info, tell sentry the details so any errors can get logged against this user info
      if (!user) {
        Sentry.setUser(null);
      } else {
        Sentry.setUser({ id: user.sub, username: user.name, email: user.email });
      }
    });

    // At this point too, we should tell users if they're on the wrong browser
    if (typeof OffscreenCanvas === "undefined" || !HTMLCanvasElement.prototype.transferControlToOffscreen) {
      this._snackService.openError(
        "Please use the latest version of Chrome browser, otherwise you may encounter errors",
        "Your browser doesn't correctly support OffscreenCanvas which is used in PIXLISE."
      );
      return;
    } else {
      if (isFirefox(navigator?.userAgent || "")) {
        this._snackService.openWarning(
          "Please use Chrome - PIXLISE will run slower in Firefox",
          "Firefox currently has much slower context image rendering than Chrome variants."
        );
        return;
      }
    }
  }

  ngOnDestroy() {
    this.closeConnection();
  }

  private beginConnect(apiUrl: string): Observable<string> {
    console.log(`APICommService [${this._id}] beginConnect`);
    return this.http.get<ArrayBuffer>(apiUrl + "ws-connect", { responseType: "arraybuffer" as "json" }).pipe(
      map((resp: ArrayBuffer) => {
        const arr = new Uint8Array(resp);
        const res = BeginWSConnectionResponse.decode(arr);
        return res.connToken;
      }),
      catchError(err => {
        // For some reason Firefox seems to (mostly locally, but seen it on prod too) end up failing to login somehow, and it
        // then sits in a loop saying error: Login required. To break this cycle, we navigate to the root page, because our token
        // must've failed to renew or something. Not getting a useful error message back from auth0 makes this hard to diagnose!
        const errMsg = `${err?.message || err}`;
        if (errMsg != "Login required") {
          console.error(`APICommService [${this._id}] beginConnect error: ${errMsg}`);
          this._snackService.openError(
            `Failed to connect to PIXLISE server. Retrying...`,
            `You may need to refresh this tab to try to reconnect. Error details: ${errMsg}`
          );
        }

        this.isConnected = false;
        throw err;
      })
    );
  }

  connect(connectEvent: () => void): Observable<any> {
    if (this.connection$) {
      return this.connection$;
    }

    const apiUrl = APIPaths.apiURL;
    // https becomes wws, http becomes ws
    const wsUrl = apiUrl.replace(/^http/, "ws");

    return this.beginConnect(apiUrl).pipe(
      switchMap((connectToken: string) => {
        const urlWithToken = wsUrl + "ws?token=" + connectToken;

        this.connection$ = webSocket({
          url: urlWithToken,
          binaryType: "arraybuffer",
          // Decode all messages as protobuf WSMessage
          deserializer: msg => {
            const arr = new Uint8Array(msg.data);

            try {
              const res = WSMessage.decode(arr);

              // Log large messages
              if (arr.length > environment.largeMessageLogThresholdBytes) {
                //const msgInfo = rawProtoMessageToDebugString(arr, 20);
                console.warn(`Large message received: ${arr.length.toLocaleString()} bytes, type: ${getMessageName(res)}, msgId: ${res.msgId}`);
              }

              return res;
            } catch (e) {
              // Log the deserialisation error, otherwise it gets swallowed up and next thing we know is the connection is closed
              const msgInfo = rawProtoMessageToDebugString(arr, 20);
              const errMsg = `Deserialisation error for incoming ${msgInfo}. Error: ${e}`;
              SentryHelper.logMsg(true, errMsg);
              console.error(e);
              throw e;
            }
          },
          serializer: (msg: WSMessage) => {
            try {
              const writer = WSMessage.encode(msg);
              const bytes = writer.finish();
              const sendbuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

              // Log large messages
              if (sendbuf.byteLength > environment.largeMessageLogThresholdBytes) {
                console.warn(`Large message being sent: ${sendbuf.byteLength} bytes, type: ${getMessageName(msg)}, msgId: ${msg.msgId}`);
              }

              return sendbuf;
            } catch (e) {
              // Log the serialisation error, otherwise it gets swallowed up and next thing we know is the connection is closed
              const errMsg = `Serialisation error for outgoing ${getMessageName(msg)} message with id: ${msg.msgId}. Error: ${e}`;
              SentryHelper.logMsg(true, errMsg);
              console.error(e);
              throw e;
            }
          },
          openObserver: {
            next: () => {
              this._connectTime = performance.now();
              console.log(`APICommService [${this._id}] beginConnect: CONNECTED`);

              // Only show the connected message if we have previously disconnected
              if (!this.isConnected) {
                this._snackService.openSuccess(`Connected to PIXLISE server`);
                this.isConnected = true;
              }
              connectEvent();
            },
            error: err => {
              console.error("APICommService: Open error");
              console.error(err);
            },
          },
          closeObserver: {
            next: (closeEvent: CloseEvent) => {
              console.log(`APICommService [${this._id}] beginConnect: Websocket Closed. Close event:`);
              console.log(closeEvent);

              const connTime = this._connectTime - performance.now();
              const connTimeStr = connTime > 0 ? `after ${(connTime / 1000).toLocaleString()}sec` : "";

              this._snackService.openError(
                `Disconnected from PIXLISE server ${connTimeStr} (error code: ${closeEvent.code}). Refresh this page to reconnect!`,
                "Check your internet connection. You may need to log in again."
              );

              this.isConnected = false;
              this.connection$ = null;
              //this.connect({ reconnect: true });
            },
            error: err => {
              this.isConnected = false;
              console.error("APICommService: Close error\n", err);
            },
          },
          closingObserver: {
            next: () => {
              console.log(`APICommService [${this._id}] beginConnect: Websocket closing...`);
              this.isConnected = false;
            },
            error: err => {
              console.error("APICommService: Closing error\n", err);
              this.isConnected = false;
            },
          },
        });

        return this.connection$;
      }),
      retry({ count: this.WS_RETRY_ATTEMPTS, delay: this.WS_RETRY_DELAY_MS })
    );
  }

  send(wsmsg: WSMessage) {
    if (!this.connection$) {
      console.error(`APICommService [${this._id}] send: No connection - cannot send data via web socket!`);
      return;
    }

    // For verbose debugging purposes...
    console.log("-->Send: " + JSON.stringify(WSMessage.toJSON(wsmsg)));
    this.connection$.next(wsmsg);
  }

  closeConnection() {
    if (this.connection$) {
      this.connection$.complete();
      this.connection$ = null;
    }
  }
}
