import { IClientLocale } from "types/global";

export const environment = {
    webSocketServerURL: 'ws://localhost:82',
    locales: [
        { code: 'ru', title: 'Русский' }, 
        { code: 'en', title: 'English'}
    ] as IClientLocale[],
    defaultLocale: 'ru'
};