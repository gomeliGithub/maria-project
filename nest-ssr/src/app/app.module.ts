import { NgModule, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MissingTranslationHandler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AdminPanelModule } from './modules/admin-panel.module';
import { ClientModule } from './modules/client.module';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ModalComponent } from './components/modal/modal.component';

import { MissingTranslationService } from './missingTranslationService';

import { AppService } from './app.service';

import { environment } from '../environments/environment';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        GalleryComponent,
        ModalComponent
    ],
    imports: [
        BrowserModule.withServerTransition({ appId: 'serverApp' }),
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [ HttpClient, PLATFORM_ID ],
            },
            missingTranslationHandler: { provide: MissingTranslationHandler, useClass: MissingTranslationService },
            defaultLanguage: environment.defaultLocale,
            useDefaultLang: true
        }),
        AppRoutingModule,
        AdminPanelModule,
        ClientModule
    ],
    providers: [AppService],
    bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory (http: HttpClient): TranslateLoader {
    if ( isPlatformBrowser(PLATFORM_ID) ) return new TranslateHttpLoader(http, `${ environment.webServerURL }/assets/locale/`, '.json');
}