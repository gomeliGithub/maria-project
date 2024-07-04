import { Client_order_status, Image_display_type, Image_photography_type, Prisma } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

import { IJWTPayload } from "./sign";

export interface IClientGetOptions {
    selectFields?: Prisma.MemberSelect<DefaultArgs>;
    selectCompressedImagesFields?: Prisma.CompressedImageSelect<DefaultArgs>;
    orders?: {
        include: boolean,
        includeCount?: boolean,
        whereStatus?: Client_order_status
    }
    compressedImages?: IClientGetCompressedImagesOptions;
    skip?: number;
    take?: number;
}

export interface IClientGetCompressedImagesOptions {
    include: boolean,
    selectFields?: Prisma.CompressedImageSelect<DefaultArgs>;
    whereNameArr?: string[],
    // whereDisplayType?: Image_display_type,
    wherePhotographyTypes?: Image_photography_type[],
    whereDisplayTypes?: Image_display_type[],
    skip?: number;
    take?: number;
    dateFrom?: Date;
    dateUntil?: Date;
}

export interface IDownloadOriginalImageOptions {
    imagePath?: string;
    compressedImageName?: string;
}

export interface ICompressedImageGetOptions {
    clientData?: IJWTPayload;
    find?: {
        imageTitles?: string[];
        selectFields?: Prisma.CompressedImageSelect<DefaultArgs>;
        // imageDisplayType?: Image_display_type;
        photographyTypes?: Image_photography_type[];
        displayTypes?: Image_display_type[];
    },
    imagesLimit?: number;
    imagesExistsCount?: number;
    dateFrom?: Date;
    dateUntil?: Date;
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
    memberLogin?: string;
    fromDate?: Date;
    untilDate?: Date;
    status?: Client_order_status;
    ordersLimit?: number;
    existsCount?: number;
}

export interface IGetFullCompressedImagesDataOptions {
    imagesLimit?: number;
    imagesExistsCount?: number;
    dateFrom?: Date;
    dateUntil?: Date;
    photographyTypes?: string[];
    displayTypes?: string[];
}