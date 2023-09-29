/*import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminPanelGuard implements CanActivate {
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return true;
  }
  
}*/

import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

import { Observable, map } from 'rxjs';

import { AppService } from '../../app.service';
 
export const ClientGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    console.log(route.routeConfig.path);
    console.log(state.url);

    const http: HttpClient = inject(HttpClient);

    const appService: AppService = inject(AppService);

    return http.get('/api/main/checkAccess').pipe(checkAccessResult => checkAccessResult as Observable<boolean>).pipe(map(checkAccessResult => {
        if ( checkAccessResult ) return true;
        else {
            appService.reloadComponent(false, '');

            return false;
        }
    }));
};