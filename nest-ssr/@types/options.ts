export interface IGetActiveClientOptions {
    includedFields?: string | string[];
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