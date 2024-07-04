import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { IMAGE_CONFIG } from '@angular/common';
import { provideRouter, withRouterConfig } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AdminPanelModule } from './modules/admin-panel.module';
import { ClientModule } from './modules/client.module';

import { routes } from './app.routes';

import { AuthInterceptor } from './interceptors/auth/auth.interceptor';

import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
    providers: [
        {
            provide: IMAGE_CONFIG,
            useValue: {
                disableImageSizeWarning: true, 
                disableImageLazyLoadWarning: true
            }
        },
        provideRouter(routes, withRouterConfig({
            onSameUrlNavigation: 'reload'
        })),
        importProvidersFrom(
            BrowserModule,
            BrowserAnimationsModule,
            HttpClientModule,
            FormsModule,
            ReactiveFormsModule,
            TranslateModule.forRoot({
                loader: {
                    provide: TranslateLoader,
                    useFactory: HttpLoaderFactory,
                    deps: [ HttpClient ],
                },
                defaultLanguage: environment.defaultLocale,
                useDefaultLang: true
            }),
            AdminPanelModule,
            ClientModule,
            NgbModule,
            CarouselModule
        ),
        provideHttpClient(withFetch(), withInterceptors([ AuthInterceptor ])),
        provideClientHydration()
    ]
};

export function HttpLoaderFactory (http: HttpClient): TranslateLoader {
    return new TranslateHttpLoader(http, '/assets/locale/', '.json');
}