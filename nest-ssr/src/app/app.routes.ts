import { Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminPanelOrdersControlComponent } from './components/admin-panel-orders-control/admin-panel-orders-control.component';
import { AdminPanelDiscountsControlComponent } from './components/admin-panel-discounts-control/admin-panel-discounts-control.component';
import { ClientComponent } from './components/client/client.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

import { ClientGuard } from './guards/client/client.guard';

export const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    {
        path: 'sign',
        children: [
            { path: 'in', component: ClientComponent },
            { path: 'up', component: ClientComponent },
        ]
    },
    { path: 'gallery/:photographyType', component: GalleryComponent },
    { path: 'adminPanel/imagesControl', component: AdminPanelComponent, canActivate: [ClientGuard] },
    { path: 'adminPanel', redirectTo: '/adminPanel/imagesControl', pathMatch: 'full' },
    { path: 'adminPanel/ordersControl', component: AdminPanelOrdersControlComponent, canActivate: [ClientGuard] },
    { path: 'adminPanel/discountsControl', component: AdminPanelDiscountsControlComponent, canActivate: [ClientGuard] },
    { path: '**', component: NotFoundComponent }
];