export interface IClientSignData {
    login: string;
    password: string;
    fullName?: string;
    email?: string;
}

export interface IClientAccessData {
    access_token: string;
    // locale: string;
    expiresTime: number;
}

export interface IClientUpdatedAccessData {
    updatedAccess_token: string;
    expiresTime: number;
}

export interface __secure_fgpData {
    __secure_fgp: string;
    __secure_fgpHash: string;
}

export interface ISignVerifyKeys {
    publicKey: string,
    privateKey: string
}