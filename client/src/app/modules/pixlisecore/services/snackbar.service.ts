import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackBarPopupComponent } from '../components/atoms/snackbar-popup/snackbar-popup.component';

export type SnackbarType = "warning" | "error" | "info" | "success";

export type SnackbarDataItem = {
    message: string;
    details: string;
    action: string;
    type: SnackbarType;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class SnackbarService {
    history: SnackbarDataItem[] = [];

    constructor(
        private _snackBar: MatSnackBar
    ) { }

    addMessageToHistory(message: string, details: string, action: string, type: SnackbarType): void {
        if (this.history.length > 10) {
            this.history.shift();
        }

        this.history.push({
            message,
            details,
            action,
            type,
            timestamp: Date.now()
        });
    }

    openWarning(message: string, details: string = "", action: string = ""): void {
        this.addMessageToHistory(message, details, action, "warning");
        this._snackBar.openFromComponent(SnackBarPopupComponent, {
            data: { message, details, action, type: "warning" },
            horizontalPosition: "left",
            panelClass: ["pixlise-warn"],
            duration: 5000
        });
    }

    openError(message: any, details: string = "", action: string = ""): void {
        let messageText = "";
        if (typeof message === "object" && message?.errorText) {
            messageText = message.errorText;
        }
        else {
            messageText = message;
        }

        this.addMessageToHistory(message, details, action, "error");
        this._snackBar.openFromComponent(SnackBarPopupComponent, {
            data: { message: messageText, details, action, type: "error" },
            horizontalPosition: "left",
            panelClass: ["pixlise-error"],
            duration: 5000
        });
    }

    openSuccess(message: string, details: string = "", action: string = ""): void {
        this.addMessageToHistory(message, details, action, "success");
        this._snackBar.openFromComponent(SnackBarPopupComponent, {
            data: { message, details, action, type: "success" },
            horizontalPosition: "left",
            panelClass: ["pixlise-success"],
            duration: 5000
        });
    }

    open(message: string, details: string = "", action: string = "Dismiss"): void {
        this.addMessageToHistory(message, details, action, "info");
        this._snackBar.open(message, action, {
            horizontalPosition: "left",
            panelClass: ["pixlise-message"],
            duration: 5000
        });
    }
}
