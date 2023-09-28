import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AdminPanelModule } from './modules/admin-panel.module';
import { ClientModule } from './modules/client.module';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        GalleryComponent
    ],
    imports: [
        BrowserModule.withServerTransition({ appId: 'serverApp' }),
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        AppRoutingModule,
        AdminPanelModule,
        ClientModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }