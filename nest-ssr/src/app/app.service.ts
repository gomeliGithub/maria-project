import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,
        
        private readonly meta: Meta, 
        private readonly platformTitle: Title
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
}