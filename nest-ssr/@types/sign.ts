import { Client_type } from "@prisma/client";

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

export interface IJWTPayload {
    id: number | null;
    login: string | null;
    type: Client_type | null;
    fullName: string | null;
    email: string | null;
    locale: string | null;
    signUpDate: Date | null,
    __secure_fgpHash?: string;
    iat?: number;
    exp?: number;
}