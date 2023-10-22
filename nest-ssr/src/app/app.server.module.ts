import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ServerModule } from '@angular/platform-server';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';

import { TranslateInterceptor } from './interceptors/translate/translate.interceptor';

@NgModule({
    imports: [
        AppModule,
        ServerModule
    ],
    providers: [
        { 
            provide: HTTP_INTERCEPTORS, 
            useClass: TranslateInterceptor, 
            multi: true 
        }
    ],
    bootstrap: [AppComponent],
})
export class AppServerModule {
    constructor () { }
}