export interface IAdmin {
    id?: number;
    login?: string;
    password?: string;
    type?: string;
    fullName?: string;
    email?: string;
    signUpDate?: Date;
    lastSignInDate?: Date;
    lastActiveDate?: Date;
    compressedImages?: IClientCompressedImage[];
}

export interface IMember {
    id?: number;
    login?: string;
    password?: string;
    type?: string;
    fullName?: string;
    email?: string;
    signUpDate?: Date;
    lastSignInDate?: Date;
    lastActiveDate?: Date;
    compressedImages?: IClientCompressedImage[];
}

export interface IClientCompressedImage {
    name?: string;
    dirPath?: string;
    originalName?: string;
    originalDirPath?: string;
    originalSize?: number;
    photographyType?: string;
    viewSizeType?: string;
    description?: string;
    uploadDate?: Date;
    displayedOnHomePage?: number;
    displayedOnGalleryPage?: number;
    adminLogin?: string;
    memberLogin?: string;
    admin?: IAdmin;
    member?: IMember;
}

export interface IJWT_token {
    token_hash?: string;
    issued_date?: Date;
    expires_date?: Date;
    revokation_date?: Date;
    revoked?: boolean;
}

export interface IImagePhotographyType {
    name: string;
    description?: string;
    originalImageName?: string;
}