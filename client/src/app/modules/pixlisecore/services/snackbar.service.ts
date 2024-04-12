import { Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { SnackBarPopupComponent } from "../components/atoms/snackbar-popup/snackbar-popup.component";
import { LocalStorageService } from "./local-storage.service";
import { WSError } from "./wsMessageHandler";
import { WidgetError } from "./widget-data.service";
import { httpErrorToString } from "src/app/utils/utils";
import { Subscription } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";

export type SnackbarType = "warning" | "error" | "info" | "success";

export type SnackbarDataItem = {
  message: string;
  details: string;
  action: string;
  type: SnackbarType;
  timestamp: number;
};

@Injectable({
  providedIn: "root",
})
export class SnackbarService {
  subscriptions: Subscription = new Subscription();
  history: SnackbarDataItem[] = [];

  constructor(
    private _snackBar: MatSnackBar,
    private _localStorageService: LocalStorageService
  ) {
    this.subscriptions.add(
      this._localStorageService.eventHistory$.subscribe(history => {
        this.history = history;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  addMessageToHistory(message: string, details: string, action: string, type: SnackbarType): void {
    this._localStorageService.addEventHistoryItem({ message, details, action, type, timestamp: Date.now() });
  }

  openWarning(message: string, details: string = "", action: string = ""): void {
    this.addMessageToHistory(message, details, action, "warning");
    this._snackBar.openFromComponent(SnackBarPopupComponent, {
      data: { message, details, action, type: "warning" },
      horizontalPosition: "left",
      panelClass: ["pixlise-warn"],
      duration: 5000,
    });
  }

  openError(message: any, details: string | Error | WidgetError = "", action: string = "", rateLimitMS = 1000): void {
    let messageText = "";
    let newDetails = "";
    if (message instanceof WidgetError) {
      messageText = (message as WidgetError).message;
      newDetails = (message as WidgetError).description;
    } else if (message instanceof WSError) {
      const wsErr = message as WSError;
      messageText = `Request failed: ${wsErr.messageName} - ${wsErr.message}`;
      newDetails = (message as WSError).errorText;
    } else if (message instanceof HttpErrorResponse) {
      const httpError = message as HttpErrorResponse;
      messageText = `Request failed: ${httpError.name} - ${httpError.message}`;
      newDetails = (message as HttpErrorResponse).message;
    } else if (typeof message === "object" && message?.errorText) {
      messageText = message.errorText;
    } else if (typeof message === "object" && message?.message) {
      messageText = message.message;
    } else {
      messageText = message;
    }

    // If the details has an error in it, interpret it a bit nicer
    if (details instanceof WidgetError) {
      if (details.message.length > 0) {
        if (newDetails.length > 0) {
          newDetails += ". ";
        }
        newDetails += details.message;
      }

      if (details.description.length > 0) {
        if (newDetails.length > 0) {
          newDetails += ". ";
        }
        newDetails += details.description;
      }
      details = newDetails;
    } else if (details instanceof Error) {
      // Badly named, but this interprets lots of kinds of errors...
      details = httpErrorToString(details, newDetails.length > 0 ? newDetails : message);
    } else {
      if (details.length > 0) {
        if (newDetails.length > 0) {
          newDetails += ". ";
        }
        newDetails += details;
      } else if ((details as any)?.["message"]) {
        if (newDetails.length > 0) {
          newDetails += ". ";
        }
        newDetails += (details as any).message;
      }
      details = newDetails;
    }

    // If the message is the same as the last one, and it's been less than the rate limit period, don't show it
    if (this.history.length > 0 && this.history[0].message === message && Date.now() - this.history[0].timestamp < rateLimitMS) {
      return;
    }

    this.addMessageToHistory(messageText, details as string, action, "error");
    this._snackBar.openFromComponent(SnackBarPopupComponent, {
      data: { message: messageText, details, action, type: "error" },
      horizontalPosition: "left",
      panelClass: ["pixlise-error"],
      duration: details ? 10000 : 5000,
    });
  }

  openSuccess(message: string, details: string = "", action: string = ""): void {
    this.addMessageToHistory(message, details, action, "success");
    this._snackBar.openFromComponent(SnackBarPopupComponent, {
      data: { message, details, action, type: "success" },
      horizontalPosition: "left",
      panelClass: ["pixlise-success"],
      duration: 5000,
    });
  }

  open(message: string, details: string = "", action: string = "Dismiss"): void {
    this.addMessageToHistory(message, details, action, "info");
    this._snackBar.open(message, action, {
      horizontalPosition: "left",
      panelClass: ["pixlise-message"],
      duration: 5000,
    });
  }

  clearHistory(): void {
    this.history = [];
    this._localStorageService.clearEventHistory();
  }
}
