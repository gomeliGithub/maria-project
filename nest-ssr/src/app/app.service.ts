import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { Observable, map } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { ModalComponent } from './components/modal/modal.component';

import { IModalCreateOptions } from 'types/options';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    public isPlatformBrowser: boolean;
    public isPlatformServer: boolean;

    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,
        
        private readonly meta: Meta, 
        private readonly platformTitle: Title,
        private readonly router: Router,
        private readonly translateService: TranslateService,
        private readonly modalService: NgbModal
    ) { 
        this.isPlatformBrowser = isPlatformBrowser(this.platformId);
        this.isPlatformServer = isPlatformServer(this.platformId);
    }

    public checkIsPlatformBrowser (): boolean {
        return this.isPlatformBrowser;
    }

    public checkIsPlatformServer (): boolean {
        return this.isPlatformServer;
    }

    public getMetaNameTag (property: string): HTMLMetaElement | null {
        return this.meta.getTag(`name="${ property }"` );
    }

    public setMetaPropertyTag (property: string, content: string): void {
        if ( this.meta.getTag(`property="${ property }"` ) === null) this.meta.addTag({ property, content });
        else this.meta.updateTag({ property, content });
    }

    public setTitle (title: string): void {
        const mainTitle: string = this.platformTitle.getTitle().split('-')[0].trim();

        this.platformTitle.setTitle(`${ mainTitle } - ${ title }`);
    }

    public async reloadComponent (self: boolean, urlToNavigateTo?: string, reloadPage = true): Promise<void> {
        const url: string | undefined = self ? this.router.url : urlToNavigateTo;

        return this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate([url]).then(() => {
                if ( reloadPage ) window.location.reload();
            });
        })
    }

    public createAuthHeaders (): HttpHeaders | null {
        const token: string | null = localStorage.getItem('access_token');

        const headers = new HttpHeaders().set('Authorization', token ? `Bearer ${ token }` : "");

        return token ? headers : null;
    }

    public createModalInstance (createOptions: IModalCreateOptions): NgbModalRef{
        const modalRef: NgbModalRef = this.modalService.open(ModalComponent, {
            backdrop: 'static',
            size: 'lg', 
            keyboard: false, 
            centered: true
        });

        modalRef.componentInstance.title = createOptions.title;
        modalRef.componentInstance.type = createOptions.type;
        modalRef.componentInstance.body = createOptions.body;

        modalRef.componentInstance.closeButton = createOptions.closeButton ? createOptions.closeButton : false;
        modalRef.componentInstance.closeButtonCaption = createOptions.closeButtonCaption ? createOptions.closeButtonCaption : undefined;

        modalRef.componentInstance.confirmButton = createOptions.confirmButton;
        modalRef.componentInstance.confirmButtonCaption = createOptions.confirmButtonCaption;

        modalRef.componentInstance.closeButtonListener = createOptions.closeButtonListener ? createOptions.closeButtonListener : undefined;
        modalRef.componentInstance.confirmButtonListener = createOptions.confirmButtonListener ? createOptions.confirmButtonListener : undefined

        return modalRef;
    }

    public createSuccessModal (bodyText?: string): NgbModalRef {
        const createOptions: IModalCreateOptions = {
            title: this.getTranslations('MODAL.SUCCESSTITLE'),
            type: 'successModal',
            body: `${ bodyText ? bodyText : this.getTranslations('DEFAULTSUCCESSMESSAGE') }`,
            closeButton: false,
            confirmButtonCaption: this.getTranslations('MODAL.BUTTONS.CONFIRMCAPTIONTEXT')
        }

        return this.createModalInstance(createOptions);
    }

    public createWarningModal (bodyText: string): NgbModalRef {
        const createOptions: IModalCreateOptions = {
            title: this.getTranslations('MODAL.WARNINGTITLE'),
            type: 'warningModal',
            body: `${bodyText}`,
            closeButton: false,
            confirmButtonCaption: this.getTranslations('MODAL.BUTTONS.CONFIRMCAPTIONTEXT')
        }

        return this.createModalInstance(createOptions);
    }

    public createErrorModal (bodyText?: string): NgbModalRef {
        const mWCreateOptions: IModalCreateOptions = {
            title: this.getTranslations('MODAL.ERRORTITLE'),
            type: 'errorModal',
            body: `${ bodyText ? bodyText : this.getTranslations('DEFAULTERRORMESSAGE') }`,
            closeButton: false,
            confirmButtonCaption: this.getTranslations('MODAL.BUTTONS.CONFIRMCAPTIONTEXT')
        }

        return this.createModalInstance(mWCreateOptions);

    }

    public getTranslations <asyncParameter extends boolean = false> (keys: string, async?: asyncParameter): asyncParameter extends true ? Observable<string> : string;
    public getTranslations <asyncParameter extends boolean = false> (keys: string[], async?: asyncParameter): asyncParameter extends true ? Observable<string[]> : string[];
    public getTranslations (keys: string | string[], async = false): Observable<string | string[]> | string | string[] {
        if ( async ) return this.translateService.get(keys).pipe(map(translations => typeof translations === 'object' ? Object.entries(translations).map(keyValueArr => keyValueArr[1]) : translations)) as Observable<string | string[]>;
        else return this.translateService.instant(keys);
    }
}