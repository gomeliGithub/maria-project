import fs from 'fs';
import { WebSocket } from 'ws';

export interface IWebSocketClient {
    _id: number, 
    login: string,
    activeWriteStream: fs.WriteStream,
    currentChunkNumber: number, 
    uploadedSize: number, 
    imageMetaName: string, 
    imageMetaSize: number,
    imagePath: string,
    lastkeepalive: number,
    connection: WebSocket
}

export interface IWSMessage {
    event: string;
    text: string;
    percentUploaded?: number;
}

export interface IPercentUploadedOptions {
    imageMetaSize: number;
    uploadedSize: number;
}

export interface IImageMeta {
    name: string;
    size: number;
    type: string;
}