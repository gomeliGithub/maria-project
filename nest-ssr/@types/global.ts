import { Request } from "express";

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
        clientSignData?: IClientSignData;
        includedFields?: string | string[];
    }

    clientLogins?: string | string[];
    newLocale?: string;
}

export interface IClient {
    login: string;
    type: 'admin' | 'member';
    locale: string;
    fullName: string;
    __secure_fgpHash?: string;
    iat?: number;
    exp?: number;
}