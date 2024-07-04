import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

import { map } from 'rxjs';

import { AppService } from '../../app.service';
 
export const ClientGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    route;
    state;

    const platformId: Object = inject(PLATFORM_ID);
    const http: HttpClient = inject(HttpClient);

    const appService: AppService = inject(AppService);

    const isBrowser: boolean = isPlatformBrowser(platformId);
    const isServer: boolean = isPlatformServer(platformId);
    
    if ( isBrowser ) {
        return http.get<boolean>('/api/admin-panel/checkAccess', { headers: appService.createAuthHeaders() ?? { }, withCredentials: true }).pipe(map(checkAccessResult => {
            if ( checkAccessResult ) return true;
            else {
                appService.reloadComponent(false, '/', false);
    
                return false;
            }
        }));
    } else if ( isServer ) {
        return true;
    }

    return true;
};