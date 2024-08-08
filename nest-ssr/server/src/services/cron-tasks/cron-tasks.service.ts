import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Stats } from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import mysqldump from 'mysqldump';

import { AppService } from '../../app.service';

import { IComponentInfo } from 'types/global';

@Injectable()
export class CronTasksService {
    public routes = [
        { url: '/home', componentFileName: 'home.component.html' },
        { url: '/gallery/individual', componentFileName: 'gallery.component.html' },
        { url: '/gallery/children', componentFileName: 'gallery.component.html' },
        { url: '/gallery/wedding', componentFileName: 'gallery.component.html' },
        { url: '/gallery/family', componentFileName: 'gallery.component.html' },
        { url: '/adminPanel', componentFileName: 'admin-panel.component.html' },
        { url: '/adminPanel/imagesControl', componentFileName: 'admin-panel.component.html' },
        { url: '/adminPanel/ordersControl', componentFileName: 'admin-panel-orders-control.component.html' },
        { url: '/adminPanel/discountsControl', componentFileName: 'admin-panel-discounts-control.component.html' },
        { url: '/sign/up', componentFileName: 'client.component.html' },
        { url: '/sign/in', componentFileName: 'client.component.html' }
    ]

    constructor (private readonly _appService: AppService) { }

    @Cron('0 0-23/12 * * *') // @Cron('0 0-23/12 * * *') - EVERY_12_HOURS // @Cron('*/30 * * * * *')
    public async databaseDump (): Promise<void> {
        const host: string = process.env.DATABASE_HOST as string;
        const user: string = process.env.DATABASE_USER as string;
        const password: string = process.env.DATABASE_PASSWORD as string;
        const name: string = process.env.DATABASE_NAME as string;

        const dateNow: number = Date.now();

        try {
            await mysqldump({
                connection: {
                    host,
                    user,
                    password,
                    database: name,
                },
                dumpToFile: `./databaseDumps/dump_${ dateNow }.sql`
            });

            await fsPromises.access(`./databaseDumps/dump_${ dateNow }.sql`, fsPromises.constants.F_OK);

            const dumpContents: string = await fsPromises.readFile(`./databaseDumps/dump_${ dateNow }.sql`, { encoding: 'utf8', flag: 'r+'});
            await fsPromises.writeFile(`./databaseDumps/dump_${ dateNow }.sql`, dumpContents.replace('/*!40101 SET NAMES utf8 */;', ''));

            this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] 'Database dump success - DumpFile dump_${ dateNow }.sql`, false, 'server');
        } catch ( err: any ) {
            this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] ${ 'Database dump error - DumpFile dump_' + dateNow + '.sql' + err }.`, true, 'server');
        }
    }

    private async getComponentsInfo (startPath: string, components: IComponentInfo[]): Promise<IComponentInfo[]> {
        const fileNames: string[] = await fsPromises.readdir(startPath);

        for ( const fileName of fileNames.filter(fileName => fileName !== 'node_modules' && !fileName.startsWith('.')) ) {
            const fileFullPath: string = path.resolve(startPath, fileName);
            const fileStat: Stats = await fsPromises.stat(fileFullPath);

            if ( fileStat.isDirectory() ) {
                const subFolderPath: string = fileFullPath;

                await this.getComponentsInfo(subFolderPath, components);
            } else if ( fileName.endsWith('component.html') ) {
                const routesInfo = this.routes.filter(routeInfo => routeInfo.componentFileName === fileName);

                if ( routesInfo.length === 1) components.push({ url: routesInfo[0].url, changeTime: fileStat.ctime, priority: 1 });
                else routesInfo.forEach(routeInfo => {
                    let priority: number = 0;

                    switch ( true ) {
                        case routeInfo.url === '/home': { priority = 1; break; }
                        case routeInfo.url.startsWith('/gallery'): { priority = 0.9; break; }
                        case routeInfo.url.startsWith('/sign'): { priority = 0.5; break; }
                        case routeInfo.url.startsWith('/adminPanel'): { priority = 0.2; break; }
                    }

                    components.push({ url: routeInfo.url, changeTime: fileStat.ctime, priority });
                });
            }
        }

        return components;
    }

    @Cron('0 0-23/3 * * *') // @Cron('0 0 3 * * *') // @Interval(10800000) // 3 hours
    public async createSitemap (): Promise<void> {
        const componentsInfo: IComponentInfo[] = await this.getComponentsInfo(path.join(process.cwd(), 'src'), [] as IComponentInfo[]);

const sitemap=`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${
    componentsInfo.map(componentsInfo => `
    <url>
        <loc>${ process.env.SERVER_DOMAIN }${ componentsInfo.url }</loc>
        <changefreq>weekly</changefreq>
        <priority>${ componentsInfo.priority }</priority>
        <lastmod>${ componentsInfo.changeTime.toISOString() }</lastmod>
    </url>    
`).join("")
}</urlset>
    `;

        await fsPromises.writeFile(path.resolve(path.join(process.cwd(), 'dist/nest-ssr/browser'), 'sitemap.xml'), sitemap);
        await fsPromises.writeFile(path.resolve(path.join(process.cwd(), 'src'), 'sitemap.xml'), sitemap);
    }
}