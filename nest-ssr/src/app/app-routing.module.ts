import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminPanelOrdersControlComponent } from './components/admin-panel-orders-control/admin-panel-orders-control.component';
import { AdminPanelDiscountsControlComponent } from './components/admin-panel-discounts-control/admin-panel-discounts-control.component';
import { ClientComponent } from './components/client/client.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

import { ClientGuard } from './guards/client/client.guard';

const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'gallery/:photographyType', component: GalleryComponent },
    { path: 'gallery', redirectTo: '/gallery/children', pathMatch: 'full' },
    { path: 'adminPanel/imagesControl', component: AdminPanelComponent, canActivate: [ClientGuard] },
    { path: 'adminPanel', redirectTo: '/adminPanel/imagesControl', pathMatch: 'full' },
    { path: 'adminPanel/ordersControl', component: AdminPanelOrdersControlComponent, canActivate: [ClientGuard] },
    { path: 'adminPanel/discountsControl', component: AdminPanelDiscountsControlComponent, canActivate: [ClientGuard] },
    { path: 'sign/:op', component: ClientComponent },
    { path: 'signUp', redirectTo: '/sign/up', pathMatch: 'full' },
    { path: 'signIn', redirectTo: '/sign/in', pathMatch: 'full' },
    { path: '**', component: NotFoundComponent }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {
        initialNavigation: 'enabledBlocking',
        scrollPositionRestoration: 'top'
    })],
    providers: [],
    exports: [RouterModule]
})
export class AppRoutingModule { }