import { Module } from '@nestjs/common';
import { AngularUniversalModule } from '@nestjs/ng-universal';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule, JwtSecretRequestType } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken';
import { ConfigModule } from '@nestjs/config';

import Importer from 'mysql-import';

import bootstrap from 'src/main.server';

import { Image_photography_type } from '@prisma/client';

import fsPromises from 'fs/promises';
import path from 'path';

import * as bcrypt from 'bcrypt';

import { PrismaModule } from './modules/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { SignModule } from './modules/sign.module';
import { ClientModule } from './modules/client.module';
import { ImageControlModule } from './modules/image-control.module';
import { AdminPanelModule } from './modules/admin-panel.module';
import { CommonModule } from './modules/common.module';

// import { CommonService } from './services/common/common.service';
import { WebSocketService } from './services/web-socket/web-socket.service';
import { MailService } from './services/mail/mail.service';
import { ValidateClientRequestsService } from './services/validate-client-requests/validate-client-requests.service';

import { IAdminWithoutRelationFields, IImagePhotographyType } from 'types/models';

@Module({
    imports: [
        AngularUniversalModule.forRoot({
            bootstrap: bootstrap,
            viewsPath: path.join(process.cwd(), 'dist/nest-ssr/browser'),
            inlineCriticalCss: false,
            cache: false
        }),
        ConfigModule.forRoot({
            envFilePath: [ 'server/config/.env.development', 'server/config/.env.production' ],
            isGlobal: true
        }),
        ScheduleModule.forRoot(),
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRETCODE as string,
            signOptions: { 
                algorithm: process.env.JWT_SIGNVERIFAY_SIGNATURE_ALGORITHM as Algorithm,
                expiresIn: process.env.JWT_EXPIRESIN_TIME as string
            },
            verifyOptions: {
                algorithms: [ process.env.JWT_SIGNVERIFAY_SIGNATURE_ALGORITHM as Algorithm ]
            },
            secretOrKeyProvider: (requestType: JwtSecretRequestType) => {
                switch ( requestType ) {
                    case JwtSecretRequestType.SIGN: return process.env.JWT_SECRETCODE as string;
                    case JwtSecretRequestType.VERIFY: return process.env.JWT_SECRETCODE as string;
                }
            }
        }), 
        PrismaModule,
        SignModule,
        ClientModule,
        ImageControlModule,
        AdminPanelModule,
        CommonModule
    ],
    controllers: [AppController],
    providers: [ PrismaService, AppService, WebSocketService, MailService, ValidateClientRequestsService ],
    exports: [ AppService, MailService, ValidateClientRequestsService ]
})
export class AppModule {
    constructor (
        private readonly _prisma: PrismaService,

        private readonly _appService: AppService
    ) {
        this._importDatabaseFromDump();
        // setTimeout(() => this._createDefaultImagePhotographyTypes(), 1000);
        // setTimeout(() => this._createExistingCompressedImages(), 1500);
    }

    private async _importDatabaseFromDump (): Promise<void> {
        const databaseDumps: string[] = await fsPromises.readdir(path.join(process.cwd(), 'databaseDumps'), { encoding: 'utf-8' });
        
        if ( databaseDumps.length !== 0 ) {
            const dumpsDate: Date[] = databaseDumps.map(data => new Date(parseInt(data.replace('dump_', '').replace('.sql', ''), 10))).sort((a, b) => b.getTime() - a.getTime());
            const lastDumpDate: Date = dumpsDate[0];

            const dumpFilePath: string = path.join(process.cwd(), 'databaseDumps', `dump_${ lastDumpDate.getTime() }.sql`);

            const membersCount: number = await this._prisma.member.count();
            const compressedImagesCount: number = await this._prisma.compressedImage.count();
            const imagePhotographyTypesCount: number = await this._prisma.imagePhotographyType.count();
            const clientOrdersCount: number = await this._prisma.clientOrder.count();
            const discountsCount: number = await this._prisma.discount.count();
            const jWTsCount: number = await this._prisma.jWT.count();

            if ( membersCount === 0 && compressedImagesCount === 0 && imagePhotographyTypesCount === 0 && clientOrdersCount === 0 && discountsCount === 0 && jWTsCount === 0 ) {
                console.log(`Starting importing data from the dump - ${ dumpFilePath }`);

                const importer = new Importer({ 
                    host: process.env.DATABASE_HOST as string, 
                    user: process.env.DATABASE_USER as string, 
                    password: process.env.DATABASE_PASSWORD as string, 
                    database: process.env.DATABASE_NAME as string
                });

                importer.onProgress(progress => {
                    const percent: number = Math.floor(progress.bytes_processed / progress.total_bytes * 10000) / 100;

                    console.log(`${ percent }% Completed`);
                });
                
                importer.import(dumpFilePath).then(() => {
                    const files_imported: {
                        file: string;
                        size: number;
                    }[] = importer.getImported();

                    this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] ${ 'Database import success - ' + files_imported.length } SQL file(s) imported. DumpFile dump_${ lastDumpDate.getTime() }.sql`, false, 'internal');
                }).catch(err => {
                    this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] ${ 'Database import error - ' + err }. DumpFile dump_${ lastDumpDate.getTime() }.sql`, true, 'internal');
                });
            } else await this._createOrUpdateMainAdmin();
        } else await this._createOrUpdateMainAdmin();

        await this._createDefaultImagePhotographyTypes();
    }

    private async _createOrUpdateMainAdmin (): Promise<void> {
        const existingAdmin: IAdminWithoutRelationFields | null = await this._prisma.admin.findUnique({ where: { id: 1 } });

        const newPasswordHash: string = await bcrypt.hash('12345Admin', parseInt(process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS as string, 10));

        if ( existingAdmin === null ) await this._prisma.admin.create({ 
                data: {
                    login: 'mainAdmin',
                    password: newPasswordHash,
                    type: 'admin',
                    fullName: "Основной администратор",
                    email: 'irina01041971@mail.ru'
                }
            });
        else await this._prisma.admin.update({ where: { id: 1 }, data: {
            password: newPasswordHash
        }});
    }

    private async _createDefaultImagePhotographyTypes (): Promise<void> {
        const originalImagesDirPath: string = path.join(this._appService.clientOriginalImagesDir, 'mainAdmin');
        // const staticFilesHomePTImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail', 'home', 'imagePhotographyTypes');
        const staticFilesHomeImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail', 'home');

        const photographyTypesDataData: IImagePhotographyType[] = await this._prisma.imagePhotographyType.findMany();

        let directoryIsExists: boolean = true;

        try {   
            await fsPromises.access(staticFilesHomeImagesDirPath, fsPromises.constants.F_OK);
        } catch { 
            directoryIsExists = false;
        }

        if ( directoryIsExists ) {
            const originalImageList: string[] = await fsPromises.readdir(originalImagesDirPath, { encoding: 'utf-8' });
            // const imagePhotographyTypesTitle: string[] = await fsPromises.readdir(staticFilesHomePTImagesDirPath, { encoding: 'utf-8' });

            // let index: number = 0;

            if ( photographyTypesDataData.length === 0 && originalImageList.length >= 4 ) { // imagePhotographyTypesTitle.length === 4
                // const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);
                
                for ( const photographyType in Image_photography_type ) {
                    /* const currentCompressedImageDirPath: string = await commonServiceRef.getFulfilledAccessPath([ 
                        staticFilesHomeImagesDirPath,
                        path.join(staticFilesHomeImagesDirPath, 'gallery', 'children'),
                        path.join(staticFilesHomeImagesDirPath, 'gallery', 'family'),
                        path.join(staticFilesHomeImagesDirPath, 'gallery', 'individual'),
                        path.join(staticFilesHomeImagesDirPath, 'gallery', 'wedding')
                    ]); */

                    /* const originalImagePath: string = await commonServiceRef.getFulfilledAccessPath([ 
                        path.join(originalImagesDirPath, imagePhotographyTypesTitle[index].replace('_thumb.jpeg', '.jpg')),
                        path.join(originalImagesDirPath, imagePhotographyTypesTitle[index].replace('_thumb.jpeg', '.jpeg')),
                        path.join(originalImagesDirPath, imagePhotographyTypesTitle[index].replace('_thumb.jpeg', '.png'))
                    ]); */
                    // const originalImageExt: string = path.extname(originalImagePath);

                    // const currentOriginalImageSize: number = ( await fsPromises.stat(originalImagePath) ).size;
                    // const currentCompressedImagePhotographyType: RegExpMatchArray | null = currentCompressedImageDirPath.match(/children|family|individual|wedding/);

                    /* await this._prisma.admin.update({
                        data: {
                            compressedImages: {
                                create: {
                                    name: imagePhotographyTypesTitle[index],
                                    dirPath: currentCompressedImageDirPath,
                                    originalName: imagePhotographyTypesTitle[index].replace('_thumb.jpeg', originalImageExt),
                                    originalDirPath: originalImagesDirPath,
                                    originalSize: currentOriginalImageSize,
                                    photographyType: currentCompressedImagePhotographyType !== null ? currentCompressedImagePhotographyType[0] as Image_photography_type : 'individual',
                                    displayType: 'horizontal',
                                    description: null
                                }
                            }
                        },
                        where: { login: 'mainAdmin' }
                    }); */

                    await this._prisma.imagePhotographyType.create({
                        data: { 
                            name: photographyType,
                            // compressedImageOriginalName: imagePhotographyTypesTitle[index].replace('_thumb.jpeg', originalImageExt),
                            // compressedImageName: imagePhotographyTypesTitle[index] 
                        }
                    });

                    // index++;
                }
            }
        }
    }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////    
    private async _createExistingCompressedImages (): Promise<void> {
        const originalImagesDirPath: string = path.join(this._appService.clientOriginalImagesDir, 'TESTADMIN');

        const staticFilesHomeImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail', 'home');
        const staticFilesGalleryImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail', 'gallery');

        const homeCompressedImagesList: string[] = await fsPromises.readdir(staticFilesHomeImagesDirPath, { encoding: 'utf-8' });
        const galleryCompressedImagesList: string[] = await fsPromises.readdir(staticFilesGalleryImagesDirPath, { encoding: 'utf-8' });

        for ( const data of homeCompressedImagesList ) {
            const isDirectory: boolean = ( await fsPromises.stat(path.join(staticFilesHomeImagesDirPath, data)) ).isDirectory();

            if ( !isDirectory ) {
                const currentHomeImagesDirPath: string = path.join(staticFilesHomeImagesDirPath, data);
                const currentOriginalImageName: string = data.replace('_thumb', '');
                const currentOriginalImageSize: number = ( await fsPromises.stat(path.join(originalImagesDirPath, currentOriginalImageName)) ).size;

                await this._prisma.admin.update({ 
                    data: { 
                        compressedImages: {
                            create: {
                                name: data,
                                dirPath: currentHomeImagesDirPath,
                                originalName: currentOriginalImageName,
                                originalDirPath: originalImagesDirPath,
                                originalSize: currentOriginalImageSize,
                                photographyType: 'individual',
                                displayType: 'vertical',
                            }
                        }
                    }, 
                    where: { id: 1 } 
                });
            }
        }

        for ( const dirName of galleryCompressedImagesList ) {
            const currentGalleryImagesDirPath: string = path.join(staticFilesGalleryImagesDirPath, dirName);
            const currentImagesList: string[] = await fsPromises.readdir(path.join(staticFilesGalleryImagesDirPath, currentGalleryImagesDirPath), { encoding: 'utf-8' });

            for ( const data of currentImagesList ) {
                const currentOriginalImageName: string = data.replace('_thumb', '');
                const currentOriginalImageSize: number = ( await fsPromises.stat(path.join(originalImagesDirPath, currentOriginalImageName)) ).size;

                await this._prisma.admin.update({ 
                    data: { 
                        compressedImages: {
                            create: {
                                name: data,
                                dirPath: currentGalleryImagesDirPath,
                                originalName: currentOriginalImageName,
                                originalDirPath: originalImagesDirPath,
                                originalSize: currentOriginalImageSize,
                                photographyType: dirName as Image_photography_type,
                                displayType: 'vertical',
                            }
                        }
                    }, 
                    where: { id: 1 } 
                });
            }
        }
    }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////   
}