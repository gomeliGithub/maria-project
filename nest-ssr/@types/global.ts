import { Request } from "express";

import { СompressedImage } from "server/src/models/client.model";

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
    },
    client?: {
        uploadImageMeta: string;
        _id: number;
    },
    adminPanel?: {
        originalImageName: string;
        displayTargetPage: 'home' | 'gallery';
    },



    clientLogins?: string | string[];
    newLocale?: string;
}

export interface IClient {
    login: string;
    type: 'admin' | 'member';
    // locale: string;
    fullName: string;
    __secure_fgpHash?: string;
    iat?: number;
    exp?: number;
}

export interface IClientBrowser {
    login: string;
    fullName: string;
    // locale: string;
}

export interface ICompressedImage {
    originalName: string;
    originalSize: number;
    uploadDate: Date;
    displayedOnHomePage: number;
    displayedOnGalleryPage: number;
}

export interface IFullCompressedImageData {
    imagesList: ICompressedImage[];
    count: number;
}

export interface IСompressedImageGetResult {
    rows: СompressedImage[];
    count?: number;
}