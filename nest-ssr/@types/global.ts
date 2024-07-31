import { Request } from "express";

import { Client_order_type, Image_display_type, Image_photography_type } from "@prisma/client";

import { IClientSignData, IJWTPayload } from "./sign";
import { IClientOrderWithoutRelationFields, ICompressedImageWithoutRelationFields } from "./models";

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
    activeClientData?: IJWTPayload;
    validatedRequest?: boolean;
}

export interface IRequestBody {
    id?: number;
    clientType?: 'admin' | 'member';
    clientLogin?: string;
    sign?: {
        clientData?: IClientSignData;
        newLocale?: string;
    },
    client?: IClientRequestBody,
    adminPanel?: IAdminPanelRequestBody
}

export interface IAdminPanelRequestBody {
    originalImageName: string;
    displayTargetPage: 'home' | 'gallery' | 'original';
    newImagePhotographyType?: Image_photography_type; 
    newImageDescription?: string;
    imagePhotographyType?: Image_photography_type;
    newImageDisplayType?: Image_display_type;

    clientOrderId?: number;
    clientLogin?: string;

    photographyTypeName?: Image_photography_type;
    photographyTypeNewDescription?: string;

    discountContent?: string; 
    fromDate?: Date; 
    toDate?: Date;

    newDiscountContent?: string;
    newFromDate?: Date;
    newToDate?: Date;
    discountId?: number;
}

export interface IClientRequestBody {
    _id: number;
    uploadImageMeta: string;
    imagePhotographyType: Image_photography_type;
    imageDisplayType: Image_display_type;
    imageDescription?: string;

    orderType: Client_order_type;
    clientPhoneNumber: string;
    comment?: string;
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
    imagesList: ICompressedImageWithoutRelationFields[];
    count: number;
    additionalImagesIsExists: boolean;
}

export interface IGalleryCompressedImagesData {
    compressedImagesDataList: ICompressedImageWithoutRelationFields[]; // compressedImagesRaw: IClientCompressedImage[][];
    photographyTypeDescription: string;
    additionalImagesExists: boolean;
}

export interface ICompressImageData {
    inputImagePath: string;
    outputDirPath: string;
    originalImageSize: number;
    imageAdditionalData: IImageAdditionalData;
}

export interface IImageAdditionalData {
    photographyType: Image_photography_type;
    displayType: Image_display_type;
    description?: string;
}

export interface IDownloadingOriginalImageData {
    name: string;
    path: string;
    extension: string;
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
    orders: IClientOrderWithoutRelationFields[];
    additionalOrdersExists: boolean;
}

export interface IComponentInfo {
    url: string;
    changeTime: Date;
}

export interface AnimationEvent {
    fromState: string | boolean;
    toState: string | boolean;
    totalTime: number;
    phaseName: string;
    element: any;
    triggerName: string;
    disabled: boolean;
}