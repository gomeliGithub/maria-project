import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
    const platformId: Object = inject(PLATFORM_ID);
    
    const isBrowser: boolean = isPlatformBrowser(platformId);
    
    if ( isBrowser ) {
        const authToken: string | null = localStorage.getItem('access_token');

        const authRequest = req.clone({
            setHeaders: {
                Authorization: `Bearer ${ authToken }`
            }
        });
    
        return next(authRequest);
    }

    return next(req.clone());
};