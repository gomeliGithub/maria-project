import { ComponentRef, ViewContainerRef } from "@angular/core";

import { ModalComponent } from "src/app/components/modal/modal.component";

import { Admin, Member } from "server/src/models/client.model";

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
    client?: Admin | Member; 
    clientType?: 'admin' | 'member';
    find?: {
        imageNames?: string[];
        includeFields?: string[];
        rawResult?: boolean;
    }
}

export interface IModalCreateOptions {
    title: string;
    type: string;
    body?: string;

    closeButton?: boolean;
    closeButtonCaption?: string;

    confirmButton?: boolean;
    confirmButtonCaption?: string;

    closeButtonListener?: Function;
    confirmButtonListener?: Function;
}

export interface IModalRef {
    modalViewRef: ViewContainerRef;
    modalComponentRef: ComponentRef<ModalComponent>;
}

export interface ICreateImageDirsOptions {
    originalImages: {
        dirPath: string;
        clientDirPath: string;
    },
    compressedImages: {
        dirPath: string;
        clientDirPath: string;
    }
}