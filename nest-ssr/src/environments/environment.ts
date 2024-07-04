import { Image_photography_type } from "@prisma/client";

import { IClientLocale } from "types/global";

export const environment = {
    production: true,
    webSocketServerURL: 'wss://burtseva.by/websocket',
    locales: [
        { code: 'ru', title: 'Русский' }, 
        { code: 'en', title: 'English'}
    ] as IClientLocale[],
    defaultLocale: 'ru',
    photographyTypes: Image_photography_type,
    signOps: [ 'up', 'in' ]
};