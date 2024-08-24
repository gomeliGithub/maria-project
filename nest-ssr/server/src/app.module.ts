import { Module } from '@nestjs/common';
import { AngularUniversalModule } from '@nestjs/ng-universal';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

import Importer from 'mysql-import';

import bootstrap from 'src/main.server';

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

import { WebSocketService } from './services/web-socket/web-socket.service';
import { MailService } from './services/mail/mail.service';
import { ValidateClientRequestsService } from './services/validate-client-requests/validate-client-requests.service';

import { IAdminWithoutRelationFields } from 'types/models';

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
        PrismaModule,
        SignModule,
        ClientModule,
        ImageControlModule,
        AdminPanelModule,
        CommonModule
    ],
    controllers: [ AppController ],
    providers: [ PrismaService, AppService, WebSocketService, MailService, ValidateClientRequestsService ],
    exports: [ AppService, MailService, ValidateClientRequestsService ]
})
export class AppModule {
    constructor (
        private readonly _prisma: PrismaService,

        private readonly _appService: AppService
    ) {
        this._importDatabaseFromDump();
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
                this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] Starting importing data from the dump - ${ dumpFilePath }`, false, 'server');

                const importer = new Importer({ 
                    host: process.env.DATABASE_HOST as string, 
                    user: process.env.DATABASE_USER as string, 
                    password: process.env.DATABASE_PASSWORD as string, 
                    database: process.env.DATABASE_NAME as string
                });

                importer.onProgress(progress => {
                    const percent: number = Math.floor(progress.bytes_processed / progress.total_bytes * 10000) / 100;

                    this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] ${ percent }% Completed`, false, 'server');
                });
                
                importer.import(dumpFilePath).then(() => {
                    const files_imported: {
                        file: string;
                        size: number;
                    }[] = importer.getImported();

                    this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] ${ 'Database import success - ' + files_imported.length } SQL file(s) imported. DumpFile dump_${ lastDumpDate.getTime() }.sql`, false, 'server');
                }).catch(err => {
                    this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] ${ 'Database import error - ' + err }. DumpFile dump_${ lastDumpDate.getTime() }.sql`, true, 'server');
                });
            } else await this._createOrUpdateMainAdmin();
        } else await this._createOrUpdateMainAdmin();
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
}