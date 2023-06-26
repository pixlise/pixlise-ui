import { Injectable } from "@angular/core";

import { Observable } from "rxjs";
import { memoizationCache } from "./memoizationCache";

@Injectable({
  providedIn: "root",
})
export class MemoizationService {
  constructor() {}

  async requestRoute(
    route: string,
    requestBody: any,requestFunc: () => Observable<any>,
    onCacheHit: (responseBody: any) => void,
    cacheResponse: boolean = true,
    maxAge: number = 24 * 60 * 60 // in seconds
): Promise<any>
{
    return await memoizationCache.routeResponses.where("route").equals(route).and((item) => 
    {
        return item.requestBody === requestBody && item.timestamp > Date.now() - maxAge * 1000
    }).toArray().then((items) => {
        if(items.length > 0)
        {
            let response = items[0].responseBody;
            onCacheHit(response);
            return response;
        }
        else
        {
            return requestFunc().subscribe((responseBody) =>
            {
                if(cacheResponse)
                {
                    memoizationCache.routeResponses.add({
                        route: route,
                        requestBody: JSON.stringify(requestBody),
                        responseBody: responseBody,
                        timestamp: Date.now(),
                    });
                }
                return responseBody;
            });
        }
      });
  }

  async cacheRouteResponse(route: string, requestBody: any, responseBody: any): Promise<void> {
    memoizationCache.routeResponses.add({
      route: route,
      requestBody: requestBody,
      responseBody: responseBody,
      timestamp: Date.now(),
    });
  }
}
