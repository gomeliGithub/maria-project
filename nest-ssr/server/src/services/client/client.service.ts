import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { Admin, Member } from '../../models/client.model';

import sequelize from 'sequelize';

import { IRequest } from 'types/global';
import { IClientGetOptions } from 'types/options';

@Injectable()
export class ClientService {
    constructor (
        @InjectModel(Admin)
        private readonly adminModel: typeof Admin,
        @InjectModel(Member) 
        private readonly memberModel: typeof Member
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
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (!(clients instanceof Admin) || (Array.isArray(clients) && !clients.every(client => client instanceof Admin))) {
            if (!Array.isArray(clients)) {

            } else {

            }
        }

        return clients;
    }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    async registerClientLastActivityTime (request: IRequest, login: string): Promise<void> {
        const client: Admin | Member = await this.get(request, login) as Admin | Member;

        await client.update({ lastActiveAt: sequelize.literal('CURRENT_TIMESTAMP') });
    }

    async registerClientLastLoginTime (request: IRequest, login: string): Promise<void> {
        const client: Admin | Member = await this.get(request, login) as Admin | Member;

        await client.update({ lastLoginAt: sequelize.literal('CURRENT_TIMESTAMP') });
    }
}