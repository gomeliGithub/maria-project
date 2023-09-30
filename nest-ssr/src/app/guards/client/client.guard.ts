import { inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

import { Observable, map } from 'rxjs';

import { AppService } from '../../app.service';
 
export const ClientGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    route;
    state;
    
    const http: HttpClient = inject(HttpClient);

    const appService: AppService = inject(AppService);

    const headers: HttpHeaders = appService.createRequestHeaders();

    return http.get('/api/admin-panel/checkAccess', { headers, withCredentials: true }).pipe(checkAccessResult => checkAccessResult as Observable<boolean>).pipe(map(checkAccessResult => {
        if ( checkAccessResult ) return true;
        else {
            appService.reloadComponent(false, '');

            return false;
        }
    }));
};