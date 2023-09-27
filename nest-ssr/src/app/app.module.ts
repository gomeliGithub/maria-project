import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AdminPanelModule } from './modules/admin-panel.module';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';

@NgModule({
    declarations: [
        AppComponent,
        GalleryComponent,
        HomeComponent
    ],
    imports: [
        BrowserModule.withServerTransition({ appId: 'serverApp' }),
        HttpClientModule,
        AppRoutingModule,
        AdminPanelModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }