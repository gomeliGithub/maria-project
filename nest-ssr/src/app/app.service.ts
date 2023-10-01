import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { ComponentRef, Inject, Injectable, PLATFORM_ID, ViewContainerRef } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { Observable, map } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { ModalComponent } from './components/modal/modal.component';
import { IModalCreateOptions } from 'types/options';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,
        
        private readonly meta: Meta, 
        private readonly platformTitle: Title,
        private readonly router: Router,
        private readonly translateService: TranslateService
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

    public createRequestHeaders (): HttpHeaders {
        if ( this.checkIsPlatformBrowser() ) {
            const token: string | null = localStorage.getItem('access_token');

            const headers = new HttpHeaders().set('Authorization', token ? `Bearer ${token}` : "");

            return headers;
        } return null;
    }

    public createModalInstance (viewRef: ViewContainerRef, createOptions: IModalCreateOptions): ComponentRef<ModalComponent> {
        viewRef.clear();

        const modalComponent = viewRef.createComponent(ModalComponent);

        modalComponent.instance.title = createOptions.title;
        modalComponent.instance.type = createOptions.type;
        modalComponent.instance.body = createOptions.body;

        modalComponent.instance.closeButton = createOptions.closeButton ? createOptions.closeButton : false;
        modalComponent.instance.closeButtonCaption = createOptions.closeButtonCaption ? createOptions.closeButtonCaption : undefined;

        modalComponent.instance.confirmButton = createOptions.confirmButton;
        modalComponent.instance.confirmButtonCaption = createOptions.confirmButtonCaption;

        modalComponent.instance.closeButtonListener = createOptions.closeButtonListener ? createOptions.closeButtonListener : undefined;
        modalComponent.instance.confirmButtonListener = createOptions.confirmButtonListener ? createOptions.confirmButtonListener : undefined;

        return modalComponent;
    }

    public createSuccessModal (viewRef: ViewContainerRef, componentRef: ComponentRef<ModalComponent>, bodyText: string): void {
        const createOptions: IModalCreateOptions = {
            title: this.getTranslations('MODAL.SUCCESSTITLE'),
            type: 'successModal',
            body: `${bodyText}`,
            closeButton: false,
            confirmButtonCaption: this.getTranslations('MODAL.BUTTONS.CONFIRMCAPTIONTEXT')
        }
            
        componentRef = this.createModalInstance(viewRef, createOptions);
    }

    public createWarningModal (viewRef: ViewContainerRef, componentRef: ComponentRef<ModalComponent>, bodyText: string): void {
        const createOptions: IModalCreateOptions = {
            title: this.getTranslations('MODAL.WARNINGTITLE'),
            type: 'warningModal',
            body: `${bodyText}`,
            closeButton: false,
            confirmButtonCaption: this.getTranslations('MODAL.BUTTONS.CONFIRMCAPTIONTEXT')
        }
            
        componentRef = this.createModalInstance(viewRef, createOptions);
    }

    public createErrorModal (viewRef: ViewContainerRef, componentRef: ComponentRef<ModalComponent>, bodyText?: string): void {
        const mWCreateOptions: IModalCreateOptions = {
            title: this.getTranslations('MODAL.ERRORTITLE'),
            type: 'errorModal',
            body: `${ bodyText ? bodyText : this.getTranslations('DEFAULTERRORMESSAGE') }`,
            closeButton: false,
            confirmButtonCaption: this.getTranslations('MODAL.BUTTONS.CONFIRMCAPTIONTEXT')
        }
            
        componentRef = this.createModalInstance(viewRef, mWCreateOptions);
    }

    public getTranslations<asyncParameter extends boolean = false> (keys: string, async?: asyncParameter): asyncParameter extends true ? Observable<string> : string;
    public getTranslations<asyncParameter extends boolean = false> (keys: string[], async?: asyncParameter): asyncParameter extends true ? Observable<string[]> : string[];
    public getTranslations(keys: string | string[], async = false): Observable<string | string[]> | string | string[] {
        if (async) return this.translateService.get(keys).pipe(map(translations => typeof translations === 'object' ? Object.entries(translations).map(keyValueArr => keyValueArr[1]) : translations)) as Observable<string | string[]>;
        else return this.translateService.instant(keys);
    }
}