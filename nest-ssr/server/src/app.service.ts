import { DynamicModule, Injectable, Type } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

import { fileURLToPath } from 'url';
import * as fs from 'fs';
import path, { dirname, join } from 'path';
import { EOL } from 'os';

import ms from 'ms';

import { ICookieSerializeOptions } from 'types/global';
import { AdminPanelModule } from './modules/admin-panel.module';
import { ClientModule } from './modules/client.module';
import { CommonModule } from './modules/common.module';
import { ImageControlModule } from './modules/image-control.module';
import { SignModule } from './modules/sign.module';

import { AdminPanelService } from './services/admin-panel/admin-panel.service';
import { ClientService } from './services/client/client.service';
import { CommonService } from './services/common/common.service';
import { ImageControlService } from './services/image-control/image-control.service';
import { SignService } from './services/sign/sign.service';
import { JwtControlService } from './services/sign/jwt-control.service';

@Injectable()
export class AppService {
    constructor (
        private lazyModuleLoader: LazyModuleLoader
    ) { }

    public staticFilesDirPath: string = join(process.cwd(), 'dist/nest-ssr/browser/assets');

    public __filename: string = fileURLToPath(import.meta.url);
    public __dirname: string = dirname(__filename);

    public logFilePath: string = join(this.__dirname, '_server.log');

    public cookieSerializeOptions: ICookieSerializeOptions = {
        httpOnly: true,
        maxAge: ms(process.env.COOKIE_MAXAGE_TIME as string),
        sameSite: 'strict',
        secure: false,
        priority: 'high'
    }

    public clientOriginalImagesDir: string = path.join(this.__dirname, 'originalImages');
    public clientCompressedImagesDir: string = path.join(this.__dirname, 'compressedImages');

    public async getServiceRef ( module: typeof AdminPanelModule, service: typeof AdminPanelService): Promise<AdminPanelService>
    public async getServiceRef ( module: typeof ClientModule, service: typeof ClientService): Promise<ClientService>
    public async getServiceRef ( module: typeof CommonModule, service: typeof CommonService): Promise<CommonService>
    public async getServiceRef ( module: typeof ImageControlModule, service: typeof ImageControlService): Promise<ImageControlService>
    public async getServiceRef ( module: typeof SignModule, service: typeof SignService): Promise<SignService>
    public async getServiceRef ( module: typeof SignModule, service: typeof JwtControlService): Promise<JwtControlService>
    public async getServiceRef ( module: DynamicModule | Type<unknown>, service: string | symbol | Function | Type<any>): Promise<AdminPanelService | ClientService | CommonService | ImageControlService | SignService | JwtControlService> {
        const moduleRef = await this.lazyModuleLoader.load(() => module);
        const serviceRef: AdminPanelService | ClientService | CommonService | ImageControlService | SignService | JwtControlService = moduleRef.get(service);

        return serviceRef;
    }

    public logLineAsync (logLine: string) {
        return new Promise<void>( (resolve, reject) => {
            const logDT = new Date();

            const time: string = logDT.toLocaleDateString() + " " + logDT.toLocaleTimeString();
            const fullLogLine: string = time + " " + logLine;
        
            console.log(fullLogLine);
        
            fs.open(this.logFilePath, 'a+', (err, logFd) => {
                if ( err ) 
                    reject(err);
                else    
                    fs.write(logFd, fullLogLine + EOL, (err) => {
                        if ( err )
                            reject(err); 
                        else    
                            fs.close(logFd, (err) =>{
                                if (err)
                                    reject(err);
                                else    
                                    resolve();
                            });
                    });
        
            });
                
        });
    }
}