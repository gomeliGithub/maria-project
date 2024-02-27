import { IClientLocale } from "types/global";

export const environment = {
    production: true,
    // webSocketServerURL: 'ws://45.128.205.220:83',
    webSocketServerURL: 'https://burtseva.by/websocket',
    locales: [
        { code: 'ru', title: 'Русский' }, 
        { code: 'en', title: 'English'}
    ] as IClientLocale[],
    defaultLocale: 'ru',
    photographyTypes: [ 'individual', 'children', 'wedding', 'family' ],
    signOps: [ 'up', 'in' ]
};