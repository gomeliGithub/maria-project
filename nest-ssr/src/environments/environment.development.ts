import { Image_photography_type } from "@prisma/client";

import { IClientLocale } from "types/global";

export const environment = {
    production: false,
    webSocketServerURL: 'ws://localhost:82',
    locales: [
        { code: 'ru', title: 'Русский' }, 
        { code: 'en', title: 'English'}
    ] as IClientLocale[],
    defaultLocale: 'ru',
    photographyTypes: Image_photography_type,
    signOps: [ 'up', 'in' ]
};