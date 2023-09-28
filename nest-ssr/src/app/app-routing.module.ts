import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { ClientComponent } from './components/client/client.component';

const routes: Routes = [
    { path: 'home', component: HomeComponent, title: 'Home' },
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'gallery', component: GalleryComponent, title: 'Gallery' },
    { path: 'adminPanel', component: AdminPanelComponent, title: 'Admin Panel' },
    { path: 'sign/:op', component: ClientComponent },
    { path: 'signUp', redirectTo: '/sign/up', pathMatch: 'full' },
    { path: 'signIn', redirectTo: '/sign/in', pathMatch: 'full' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {
        initialNavigation: 'enabledBlocking',
        scrollPositionRestoration: 'enabled',
        onSameUrlNavigation: 'reload'
    })],
    exports: [RouterModule]
})
export class AppRoutingModule { }
