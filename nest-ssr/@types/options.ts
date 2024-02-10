import { Response } from 'express';

import { Admin } from "server/src/models/client.model";

export interface IGetActiveClientOptions {
    includeFields?: string | string[];
    allowedIncludedFields?: string[];
    clientLocale?: string;
    response?: Response;
}

export interface IClientGetOptions {
    includeFields?: string[];
    clientType?: 'admin' | 'member';
    includeOrders?: boolean;
}

export interface IDownloadOriginalImageOptions {
    imagePath?: string;
    compressedImageName?: string;
}

export interface ICompressedImageGetOptions {
    clientInstance?: Admin;
    find?: {
        imageTitles?: string[];
        includeFields?: string[];
        imageViewSize?: string;
    },
    imagesLimit?: number;
    imagesExistsCount?: number;
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

export interface IGetClientOrdersOptions {
    getInfoData?: string;
    memberLogin?: string;
    fromDate?: Date;
    untilDate?: Date;
    status?: string;
    ordersLimit?: number;
    existsCount?: number;
}