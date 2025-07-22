import { Injectable } from "@angular/core";
import { HttpRequest, HttpHandler, HttpEvent } from "@angular/common/http";
import { AuthHttpInterceptor } from "@auth0/auth0-angular";
import { Observable } from "rxjs";

@Injectable()
export class CustomAuthHttpInterceptor extends AuthHttpInterceptor {
  override intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = sessionStorage.getItem("reviewer_access_token");
    if (token) {
      let isValid = this.isTokenValid(token);
      if (isValid) {
        const clonedRequest = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        return next.handle(clonedRequest);
      }
    }

    return super.intercept(req, next);
  }

  private isTokenValid(token: string): boolean {
    let payload = JSON.parse(atob(token.split(".")[1]));

    let exp = payload?.exp || 0;
    let current_time = Date.now() / 1000;
    return exp > current_time;
  }
}
