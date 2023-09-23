import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import fs from 'fs';
import path from 'path';

import { Response } from 'express';

import { AppService } from '../../app.service';

import { Admin, Member } from '../../models/client.model';
import { СompressedImage } from '../../models/image-control.model';

import sequelize from 'sequelize';

import { IRequest } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions } from 'types/options';

@Injectable()
export class ClientService {
    constructor (
        private readonly appService: AppService,
        
        @InjectModel(Admin)
        private readonly adminModel: typeof Admin,
        @InjectModel(Member) 
        private readonly memberModel: typeof Member,
        @InjectModel(СompressedImage)
        private readonly compressedImageModel: typeof СompressedImage
    ) { }

    public async get (request: IRequest, loginList: string, options?: IClientGetOptions): Promise<Admin | Member>
    public async get (request: IRequest, loginList: string[], options?: IClientGetOptions): Promise<Admin[] | Member[]>
    public async get (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]>
    public async get (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]> {
        const findOptions = {
            raw: false, 
            where: { login: loginList },
            attributes: null,
            rejectOnEmpty: true
        }

        let clients: Admin | Member | Admin[] | Member[] = null;

        if (options && options.includeFields) findOptions.attributes = options.includeFields;
        if (options && options.hasOwnProperty('rawResult')) findOptions.raw = options.rawResult;

        if (options && !options.clientType) {
            try {
                if (!Array.isArray(loginList)) {
                    clients = await Promise.any([
                        this.adminModel.findOne(findOptions),
                        this.memberModel.findOne(findOptions)
                    ]);
                } else {
                    clients = (await Promise.any([
                        this.adminModel.findAll(findOptions),
                        this.memberModel.findAll(findOptions)
                    ]));
                }
            } catch {
                return null;
            }
        }

        if (!(clients instanceof Admin) || (Array.isArray(clients) && !clients.every(client => client instanceof Admin))) {
            if (!Array.isArray(clients)) {

            } else {

            }
        }

        return clients;
    }

    public async registerClientLastActivityTime (request: IRequest, login: string): Promise<void> {
        const client: Admin | Member = await this.get(request, login) as Admin | Member;

        await client.update({ lastActiveAt: sequelize.literal('CURRENT_TIMESTAMP') });
    }

    public async registerClientLastLoginTime (request: IRequest, login: string): Promise<void> {
        const client: Admin | Member = await this.get(request, login) as Admin | Member;

        await client.update({ lastLoginAt: sequelize.literal('CURRENT_TIMESTAMP') });
    }

    public async uploadImage (request: IRequest, imageName: string): Promise<void> {
        const activeClientLogin: string = await this.appService.getActiveClient(request, { includeFields: 'login' });

        const newOriginalImagePath: string = path.join(this.appService.clientOriginalImagesDir, activeClientLogin, imageName);

        const writeStream: fs.WriteStream = fs.createWriteStream(newOriginalImagePath);

        request.on('data', chunk => writeStream.write(chunk));
        request.on('end', () => writeStream.end());

        writeStream.on('close', async () => {
            const compressResult: boolean = await this.appService.compressImage(newOriginalImagePath, path.join(this.appService.__dirname, 'src/assets'));

            if (!compressResult) throw new InternalServerErrorException();
        });

        request.on('error', error => {
            console.error(error);

            throw new InternalServerErrorException();
        });
    }

    public async downloadOriginalImage (response: Response, options: IDownloadOriginalImageOptions): Promise<void> {
        if ( options.imagePath ) {
            response.download(options.imagePath);

            return;
        }

        if ( options.compressedImageName ) {
            const compressedImageData: СompressedImage = await this.compressedImageModel.findOne({ where: { imageName: options.compressedImageName }});

            if ( compressedImageData ) response.download(path.join(compressedImageData.originalImageDirPath, compressedImageData.originalImageName));
            else throw new BadRequestException();

            return;
        }
    }
}