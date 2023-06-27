import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType } from "@angular/common/http";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { Observable, of, switchMap, map, delay, retry } from "rxjs";

import { environment } from "src/environments/environment";

import { WSMessage } from "../../../generated-protos/websocket";
import { BeginWSConnectionResponse } from "../../../generated-protos/restmsgs";
import { APIPaths } from 'src/app/utils/api-helpers';


@Injectable({
    providedIn: 'root'
})
export class APICommService
{
    connection$: WebSocketSubject<any> | null = null;
    WS_RETRY_ATTEMPTS = 30;
    WS_RETRY_DELAY_MS = 2000;

    constructor(
        private http: HttpClient,
        )
    {
    }

    ngOnDestroy()
    {
        this.closeConnection();
    }

    private beginConnect(apiUrl: string): Observable<string>
    {
        return this.http.get<ArrayBuffer>(apiUrl+"ws-connect", {responseType: "arraybuffer" as "json"}).pipe(
            map(
                (resp: ArrayBuffer)=>
                {
                    const arr = new Uint8Array(resp);
                    const res = BeginWSConnectionResponse.decode(arr);
                    return res.connToken;
                }
            )
        );
    }

    connect(connectEvent: ()=>void): Observable<any>
    {
        if(this.connection$)
        {
            return this.connection$;
        }

        let apiUrl = APIPaths.apiURL;
        // https becomes wws, http becomes ws
        let wsUrl = apiUrl.replace(/^http/, "ws");

        return this.beginConnect(apiUrl).pipe(
            switchMap(
                (connectToken: string)=>
                {
                    wsUrl += "ws?token="+connectToken;

                    this.connection$ = webSocket({
                        url: wsUrl,
                        binaryType: "arraybuffer",
                        // Decode all messages as protobuf WSMessage
                        deserializer: (msg)=>
                        {
                            const arr = new Uint8Array(msg.data);
                            const res = WSMessage.decode(arr);
                            return res;
                        },
                        serializer: (msg: WSMessage)=>
                        {
                            let writer = WSMessage.encode(msg);
                            let bytes = writer.finish();
                            let sendbuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength);
                            return sendbuf;
                        },
                        openObserver:
                        {
                            next: () => {
                                console.log('Websocket connected');

                                connectEvent();
                            }
                        },
                        closeObserver: {
                            next: () => {
                                console.log('Websocket closed');
                                this.connection$ = null;
                                //this.connect({ reconnect: true });
                            }
                        },
                    });

                    return this.connection$;
                }
            ),
            retry({count: this.WS_RETRY_ATTEMPTS, delay: this.WS_RETRY_DELAY_MS})
        );
    }

    send(wsmsg: WSMessage)
    {
        if(!this.connection$)
        {
            console.error("No connection: Cannot send data via web socket!");
            return;
        }

        this.connection$.next(wsmsg);
    }

    closeConnection()
    {
        if(this.connection$)
        {
            this.connection$.complete();
            this.connection$ = null;
        }
    }
}
