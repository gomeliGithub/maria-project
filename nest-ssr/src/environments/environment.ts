import { IClientLocale } from "types/global";

export const environment = {
    production: true,
    webSocketServerURL: 'ws://178.172.173.222:83',
    locales: [
        { code: 'ru', title: 'Русский' }, 
        { code: 'en', title: 'English'}
    ] as IClientLocale[],
    defaultLocale: 'ru'
};