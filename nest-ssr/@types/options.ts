import { ComponentRef, ElementRef, ViewContainerRef } from "@angular/core";

import { ModalComponent } from "src/app/components/modal/modal.component";

export interface IGetActiveClientOptions {
    includeFields?: string | string[];
    allowedIncludedFields?: string[];
}

export interface IClientGetOptions {
    includeFields?: string[];
    rawResult?: boolean;
    clientType?: 'admin' | 'member';
}

export interface IDownloadOriginalImageOptions {
    imagePath?: string;
    compressedImageName?: string;
}

export interface IСompressedImageGetOptions {
    includeFields?: string[];
    includeCount?: boolean;
}

export interface IModalCreateOptions {
    title: string;
    type: string;
    body?: string;

    closeButton?: boolean;
    closeButtonCaption?: string;

    confirmButtonCaption?: string;

    closeButtonListener?: Function;
    confirmButtonListener?: Function;
}
export interface IModalRef {
    modalViewRef: ViewContainerRef;
    modalComponentRef: ComponentRef<ModalComponent>;
    progressElementElementRef: ElementRef<HTMLDivElement>;
}