import { IClientLocale } from "types/global";

export const environment = {
    production: false,
    webSocketServerURL: 'ws://localhost:82',
    locales: [
        { code: 'ru', title: 'Русский' }, 
        { code: 'en', title: 'English'}
    ] as IClientLocale[],
    defaultLocale: 'ru',
    photographyTypes: [ 'individual', 'children', 'wedding', 'family' ],
    signOps: [ 'up', 'in' ]
};