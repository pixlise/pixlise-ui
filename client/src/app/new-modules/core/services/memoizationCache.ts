import Dexie, { Table } from "dexie";

export interface RouteResponse {
  id?: number;
  route: string;
  requestBody: any;
  responseBody: any;
  timestamp: number;
}

export class MemoizationCache extends Dexie {
  routeResponses!: Table<RouteResponse, number>;

  constructor() {
    super("ngdexieliveQuery");

    this.version(3).stores({
      routeResponses: "++id, route, type, requestBody, responseBody, timestamp",
    });
    // this.on("populate", () => this.populate());
  }

  //   async populate() {
  //     await memoizationCache.routeResponses.bulkAdd([
  //       {
  //         route: "test",
  //         requestBody: "testBody",
  //         responseBody: "test response",
  //         timestamp: Date.now(),
  //       },
  //     ]);
  //   }
}

export const memoizationCache = new MemoizationCache();
