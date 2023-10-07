import { Request } from "express";

import { IClientSignData } from "./sign";

export interface ICookieSerializeOptions {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    priority?: 'low' | 'medium' | 'high';
    sameSite?: boolean | 'lax' | 'none' |'strict';
    secure?: boolean;
}

export interface IRequest extends Request {
    session: null;
}

export interface IRequestBody {
    id?: number;
    clientType?: 'admin' | 'member';
    clientLogin?: string;
    sign?: {
        clientData?: IClientSignData;
        newLocale?: string;
    },
    client?: {
        _id: number;
        uploadImageMeta: string;
        imageEventType: string;
        imageDescription?: string;
    },
    adminPanel?: {
        originalImageName: string;
        displayTargetPage: 'home' | 'gallery' | 'original';
        newImageEventType?: string; 
        newImageDescription?: string;
    },



    clientLogins?: string | string[];
}

export interface IClient {
    login: string;
    type: 'admin' | 'member';
    locale: string;
    fullName: string;
    __secure_fgpHash?: string;
    iat?: number;
    exp?: number;
}

export interface IClientBrowser {
    login: string;
    type: string;
    fullName: string;
    locale: string;
}

export interface IClientLocale {
    code: string; 
    title: string;
}

export interface ICompressedImage {
    imageName?: string;
    originalName?: string;
    originalSize?: number;
    imageEventType?: string; 
    imageDescription?: string;
    uploadDate?: Date;
    displayedOnHomePage?: number;
    displayedOnGalleryPage?: number;
}

export interface IFullCompressedImageData {
    imagesList: ICompressedImage[];
    count: number;
}

export interface ICompressImageData {
    inputImagePath: string;
    outputDirPath: string;
    originalImageSize: number;
    imageAdditionalData: IImageAdditionalData;
}

export interface IImageAdditionalData {
    imageEventType: string;
    imageDescription?: string;
}

export interface IComponentInfo {
    url: string;
    changeTime: Date;
}