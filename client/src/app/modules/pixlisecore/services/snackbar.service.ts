import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackBarPopupComponent } from '../components/atoms/snackbar-popup/snackbar-popup.component';


@Injectable({
    providedIn: 'root'
})
export class SnackbarService {
    constructor(
        private _snackBar: MatSnackBar
    ) { }

    openWarning(message: string, action: string = ""): void {
        this._snackBar.openFromComponent(SnackBarPopupComponent, {
            data: { message, action, type: "warning" },
            horizontalPosition: "left",
            panelClass: ["pixlise-warn"],
            duration: 5000
        });
    }

    openError(message: any, action: string = ""): void {
        let messageText = "";
        if (typeof message === "object" && message?.errorText) {
            messageText = message.errorText;
        }
        else {
            messageText = message;
        }

        this._snackBar.openFromComponent(SnackBarPopupComponent, {
            data: { message: messageText, action, type: "error" },
            horizontalPosition: "left",
            panelClass: ["pixlise-error"],
            duration: 5000
        });
    }

    openSuccess(message: string, action: string = ""): void {
        this._snackBar.openFromComponent(SnackBarPopupComponent, {
            data: { message, action, type: "success" },
            horizontalPosition: "left",
            panelClass: ["pixlise-success"],
            duration: 5000
        });
    }

    open(message: string, action: string = "Dismiss"): void {
        this._snackBar.open(message, action, {
            horizontalPosition: "left",
            panelClass: ["pixlise-message"],
            duration: 5000
        });
    }
}
