import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { Observable, map } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ModalComponent } from './components/modal/modal.component';

import { ClientService } from './services/client/client.service';

import { IModalCreateOptions } from 'types/options';
import { ICompressedImageWithoutRelationFields } from 'types/models';

@Injectable({
    providedIn: 'root'
})
export class AppService {
    constructor (
        private readonly meta: Meta, 
        private readonly platformTitle: Title,
        private readonly router: Router,
        private readonly translateService: TranslateService,
        private readonly modalService: NgbModal
    ) { }

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

    public onRouterOutletGalleryComponent (appComponentThis: AppComponent, galleryComponent: GalleryComponent): void {
        let compressedImagesList: ICompressedImageWithoutRelationFields[] | null = null;
        let additionalImagesExists: boolean = false;
        let photographyTypeDescription: string | null = null;

        switch ( galleryComponent.photographyType ) {
            case 'individual': {
                if ( appComponentThis.galleryIndividualCompressedImagesData ) {
                    compressedImagesList = appComponentThis.galleryIndividualCompressedImagesData.compressedImagesDataList;
                    additionalImagesExists = appComponentThis.galleryIndividualCompressedImagesData.additionalImagesExists;
                    photographyTypeDescription = appComponentThis.galleryIndividualCompressedImagesData.photographyTypeDescription ? appComponentThis.galleryIndividualCompressedImagesData.photographyTypeDescription : null;
                }

                break;
            }

            case 'children': {
                if ( appComponentThis.galleryChildrenCompressedImagesData ) {
                    compressedImagesList = appComponentThis.galleryChildrenCompressedImagesData.compressedImagesDataList;
                    additionalImagesExists = appComponentThis.galleryChildrenCompressedImagesData.additionalImagesExists;
                    photographyTypeDescription = appComponentThis.galleryChildrenCompressedImagesData.photographyTypeDescription ? appComponentThis.galleryChildrenCompressedImagesData.photographyTypeDescription : null;
                }
                
                break;
            }

            case 'wedding': {
                if ( appComponentThis.galleryWeddingCompressedImagesData ) {
                    compressedImagesList = appComponentThis.galleryWeddingCompressedImagesData.compressedImagesDataList;
                    additionalImagesExists = appComponentThis.galleryWeddingCompressedImagesData.additionalImagesExists;
                    photographyTypeDescription = appComponentThis.galleryWeddingCompressedImagesData.photographyTypeDescription ? appComponentThis.galleryWeddingCompressedImagesData.photographyTypeDescription : null;
                }

                break;
            }

            case 'family': {
                if ( appComponentThis.galleryFamilyCompressedImagesData ) {
                    compressedImagesList = appComponentThis.galleryFamilyCompressedImagesData.compressedImagesDataList;
                    additionalImagesExists = appComponentThis.galleryFamilyCompressedImagesData.additionalImagesExists;
                    photographyTypeDescription = appComponentThis.galleryFamilyCompressedImagesData.photographyTypeDescription ? appComponentThis.galleryFamilyCompressedImagesData.photographyTypeDescription : null;
                }

                break;
            }
        }

        galleryComponent.compressedImagesList = compressedImagesList;
        galleryComponent.additionalImagesExists = additionalImagesExists;
        galleryComponent.photographyTypeDescription = photographyTypeDescription ? photographyTypeDescription : null;

        if ( galleryComponent.compressedImagesList ) {
            ( galleryComponent.compressedImagesList as ICompressedImageWithoutRelationFields[]).forEach(() => {
                galleryComponent.linkContainerAnimationStates.push('leave');
                galleryComponent.linkContainerAnimationDisplayValues.push('none');
            });
        }
    }

    public updateCanonicalLink (documentDOM: Document, domainURL: string, newCanonicalUrl: string): void {
        const canonicalUrl: string = domainURL + '/' + newCanonicalUrl;
        const head: HTMLHeadElement = documentDOM.getElementsByTagName('head')[0];

        let element: HTMLLinkElement | undefined = documentDOM.querySelector(`link[rel='canonical']`) as HTMLLinkElement || undefined;

        if ( !element ) {
            element = documentDOM.createElement('link') as HTMLLinkElement;
            
            head.appendChild(element);
        }

        element.setAttribute('rel', 'canonical');
        element.setAttribute('href', canonicalUrl);
    }

    public navbarTogglerClick (componentThis: AppComponent, animationStart: boolean): void {
        if ( animationStart ) componentThis.changeNavbarTogglerIconTriggerState();

        componentThis.navbarIsCollapsed = !componentThis.navbarIsCollapsed;
        if ( !componentThis.prevNavbarAnimationState ) componentThis.prevNavbarAnimationState = componentThis.navbarAnimationState;

        if ( componentThis.prevNavbarAnimationState === 'static' ) {
            if ( !componentThis.navbarIsCollapsed ) componentThis.navbarAnimationState = 'scrolled';
            else {
                componentThis.navbarAnimationState = 'static';

                componentThis.prevNavbarAnimationState = null;
            }
        } else if ( componentThis.prevNavbarAnimationState === 'scrolled' ) {
            if ( !componentThis.navbarIsCollapsed ) componentThis.navbarAnimationState = 'scrolled';
        }
    }

    public changeClientLocale (componentThis: AppComponent, clientService: ClientService, event: MouseEvent, documentDOM: Document): void {
        const localeButton: HTMLAnchorElement = event.target as HTMLAnchorElement;

        const newLocale: string = localeButton.id;

        clientService.changeClientLocale(newLocale).subscribe({
            next: data => {
                documentDOM.documentElement.lang = newLocale;

                if ( data[0] ) localStorage.setItem('access_token', data[0]);

                componentThis.activeClientLocale = newLocale;

                this.createSuccessModal(this.getTranslations('CHANGECLIENTLOCALESUCCESSMESSAGE'));
            },
            error: () => this.createErrorModal()
        });
    }
}