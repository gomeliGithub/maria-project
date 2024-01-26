import { IClientLocale } from "types/global";

export const environment = {
    production: true,
    webSocketServerURL: 'ws://45.128.205.220:83',
    locales: [
        { code: 'ru', title: 'Русский' }, 
        { code: 'en', title: 'English'}
    ] as IClientLocale[],
    defaultLocale: 'ru'
};