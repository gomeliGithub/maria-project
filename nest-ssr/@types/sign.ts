export interface IClientSignData {
    login: string;
    password: string;
    fullName?: string;
    email?: string;
}

export interface __secure_fgpData {
    __secure_fgp: string;
    __secure_fgpHash: string;
}

export interface ISignVerifyKeys {
    publicKey: string,
    privateKey: string
}