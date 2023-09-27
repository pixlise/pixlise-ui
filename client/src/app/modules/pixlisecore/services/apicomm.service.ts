import { Injectable, OnDestroy } from "@angular/core";
import { HttpClient, HttpErrorResponse, HttpEventType } from "@angular/common/http";
import { webSocket, WebSocketSubject } from "rxjs/webSocket";

import { Observable, of, switchMap, map, delay, retry, catchError } from "rxjs";

import { environment } from "src/environments/environment";

import { WSMessage } from "../../../generated-protos/websocket";
import { BeginWSConnectionResponse } from "../../../generated-protos/restmsgs";
import { APIPaths } from "src/app/utils/api-helpers";
import { randomString } from "src/app/utils/utils";

@Injectable({
  providedIn: "root",
})
export class APICommService implements OnDestroy {
  connection$: WebSocketSubject<any> | null = null;
  WS_RETRY_ATTEMPTS = 30;
  WS_RETRY_DELAY_MS = 2000;

  private _id = randomString(6);

  constructor(private http: HttpClient) {
    console.log(`APICommService [${this._id}] created`);
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
        console.error(`APICommService [${this._id}] beginConnect error: ${err}`);
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
            const res = WSMessage.decode(arr);
            return res;
          },
          serializer: (msg: WSMessage) => {
            const writer = WSMessage.encode(msg);
            const bytes = writer.finish();
            const sendbuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
            return sendbuf;
          },
          openObserver: {
            next: () => {
              console.log(`APICommService [${this._id}] beginConnect: CONNECTED`);
              connectEvent();
            },
          },
          closeObserver: {
            next: () => {
              console.log(`APICommService [${this._id}] beginConnect: Websocket Closed`);
              this.connection$ = null;
              //this.connect({ reconnect: true });
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
    console.log("Sending: " + JSON.stringify(WSMessage.toJSON(wsmsg)));
    this.connection$.next(wsmsg);
  }

  closeConnection() {
    if (this.connection$) {
      this.connection$.complete();
      this.connection$ = null;
    }
  }
}
