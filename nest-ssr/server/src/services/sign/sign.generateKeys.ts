import * as crypto from 'crypto';

import { __secure_fgpData, ISignVerifyKeys } from 'types/sign';

export function generateSignVerifyKeys (): ISignVerifyKeys {
    const keys = crypto.generateKeyPairSync("ec", {
        namedCurve: "secp256k1",
        //modulusLength: '1024',
        publicKeyEncoding: {
            type: "spki",
            format: "pem"
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem"
        }
    });

    const results: ISignVerifyKeys = {
        publicKey: keys.publicKey,
        privateKey: keys.privateKey
    };

    return results;
}

export function generateJWT_SecretCode (): string {
    const JWTSecretCode: string = (crypto.createHmac("SHA512", crypto.randomBytes(512))).digest('hex');
    
    return JWTSecretCode;
}

export function generate__secure_fgp (): __secure_fgpData {
    const __secure_fgp: string = crypto.randomBytes(50).toString("hex");
    const __secure_fgpHash: string = crypto.createHmac("SHA256", __secure_fgp).digest('hex');

    return {
        __secure_fgp: __secure_fgp,
        __secure_fgpHash: __secure_fgpHash
    }
}

export function generateCookieSecret (): string {
    const cookieSecret: string = crypto.randomBytes(50).toString("hex");

    return cookieSecret;
}

export function generateCspNonce () {
    // const cspNonce = crypto.createHmac('sha512', crypto.randomBytes(512)).digest('base64');

    const cspNonce = crypto.randomBytes(32).toString('base64');

    return cspNonce;
}