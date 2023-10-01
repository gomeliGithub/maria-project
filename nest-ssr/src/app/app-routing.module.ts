import { NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy, RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { ClientComponent } from './components/client/client.component';

import { ClientGuard } from './guards/client/client.guard';

class CustomReuseStrategy implements RouteReuseStrategy {
    public shouldDetach(route: ActivatedRouteSnapshot): boolean { return false; }
    public store(route: ActivatedRouteSnapshot, detachedTree: DetachedRouteHandle): void {}
    public shouldAttach(route: ActivatedRouteSnapshot): boolean { return false; }
    public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle { return null; }
    shouldReuseRoute () {
        return false;
    }
}

const routes: Routes = [
    { path: 'home', component: HomeComponent},
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'gallery', component: GalleryComponent },
    { path: 'adminPanel', component: AdminPanelComponent, canActivate: [ClientGuard] },
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
    providers: [
        {
            provide: RouteReuseStrategy,
            useClass: CustomReuseStrategy,
        }
    ],
    exports: [RouterModule]
})
export class AppRoutingModule { }