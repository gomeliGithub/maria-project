import { NgModule } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AdminPanelModule } from './modules/admin-panel.module';
import { ClientModule } from './modules/client.module';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ModalComponent } from './components/modal/modal.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

import { AppService } from './app.service';

import { environment } from '../environments/environment';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        GalleryComponent,
        ModalComponent,
        NotFoundComponent
    ],
    imports: [
        BrowserModule.withServerTransition({ appId: 'serverApp' }),
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
        AppRoutingModule,
        AdminPanelModule,
        ClientModule,
        NgbModule
    ],
    providers: [AppService],
    bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory (http: HttpClient): TranslateLoader {
    return new TranslateHttpLoader(http, '/assets/locale/', '.json');
}