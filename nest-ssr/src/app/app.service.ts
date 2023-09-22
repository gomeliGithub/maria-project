import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    constructor(
        private meta: Meta, private platformTitle: Title
    ) { }

    public setMetaTag (property: string, content: string): void {
        if ( this.meta.getTag(`property="${ property }"` ) === null) this.meta.addTag({ property, content });
        else this.meta.updateTag({ property, content });
    }

    public setTitle (title: string): void {
        this.platformTitle.setTitle(title);
    }
}