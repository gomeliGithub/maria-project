import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,
        
        private readonly meta: Meta, 
        private readonly platformTitle: Title,
        private readonly router: Router
    ) { }

    public checkIsPlatformBrowser (): boolean {
        return isPlatformBrowser(this.platformId);
    }

    public checkIsPlatformServer (): boolean {
        return isPlatformServer(this.platformId);
    }

    public setMetaTag (property: string, content: string): void {
        if ( this.meta.getTag(`property="${ property }"` ) === null) this.meta.addTag({ property, content });
        else this.meta.updateTag({ property, content });
    }

    public setTitle (title: string): void {
        this.platformTitle.setTitle(title);
    }

    public reloadComponent (self: boolean, urlToNavigateTo?: string) {
        const url: string = self ? this.router.url : urlToNavigateTo;

        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate([url]).then(() => {
                console.log(`After navigation I am on: ${ this.router.url }`);
            })
        })
    }
}