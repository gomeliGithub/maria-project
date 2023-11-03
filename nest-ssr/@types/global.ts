import { Request } from "express";

import { IClientSignData } from "./sign";
import { IClientCompressedImage, IClientOrder } from "./models";

export interface ICookieSerializeOptions {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    priority?: 'low' | 'medium' | 'high';
    sameSite?: boolean | 'lax' | 'none' | 'strict';
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
        imagePhotographyType: string;
        imageViewSizeType: string;
        imageDescription?: string;

        orderType: string;
        clientPhoneNumber: string;
        comment?: string;
    },
    adminPanel?: {
        originalImageName: string;
        displayTargetPage: 'home' | 'gallery' | 'original';
        newImagePhotographyType?: string; 
        newImageDescription?: string;
        imagePhotographyType?: string;
        newImageViewSizeType?: string;

        clientOrderId?: number;
        clientLogin?: string;

        photographyTypeName?: string;
        photographyTypeNewDescription?: string;
    }
}

export interface IClient {
    id: number;
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

export interface IFullCompressedImageData {
    imagesList: IClientCompressedImage[];
    count: number;
}

export interface IGalleryCompressedImagesList {
    compressedImages: IReducedGalleryCompressedImages;
    photographyTypeDescription: string;
}

export interface IReducedGalleryCompressedImages {
    small: IClientCompressedImage[][];
    medium: IClientCompressedImage[][];
    big: IClientCompressedImage[][];
}

export interface ICompressImageData {
    inputImagePath: string;
    outputDirPath: string;
    originalImageSize: number;
    imageAdditionalData: IImageAdditionalData;
}

export interface IImageAdditionalData {
    photographyType: string;
    viewSizeType: string;
    description?: string;
}

export interface IClientOrdersInfoData {
    infoData: IClientOrdersInfoDataArr[];
    additionalOrdersInfoDataExists: boolean;
}

export interface IClientOrdersInfoDataArr {
    login: string;
    ordersCount: number;
}

export interface IClientOrdersData {
    orders: IClientOrder[];
    additionalOrdersExists: boolean;
}

export interface IComponentInfo {
    url: string;
    changeTime: Date;
}

export interface AnimationEvent {
    fromState: string
    toState: string
    totalTime: number
    phaseName: string
    element: any
    triggerName: string
    disabled: boolean
}