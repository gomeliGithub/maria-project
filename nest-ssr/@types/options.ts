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