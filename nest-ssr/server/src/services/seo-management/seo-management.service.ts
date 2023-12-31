import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import fsPromises from 'fs/promises';
import path from 'path';

import { AppService } from '../../app.service';

import { IComponentInfo } from 'types/global';

@Injectable()
export class SeoManagementService {
    constructor (
        private readonly appService: AppService
    ) { }

    public routes = [
        { url: '/home', componentFileName: 'home.component.html' },
        { url: '/', componentFileName: 'home.component.html' },
        { url: '/gallery', componentFileName: 'gallery.component.html'},
        { url: '/adminPanel', componentFileName: 'admin-panel.component.html'},
        { url: '/adminPanel/imagesControl', componentFileName: 'admin-panel.component.html'},
        { url: '/adminPanel/ordersControl', componentFileName: 'admin-panel-orders-control.component.html'},
        { url: '/adminPanel/discountsControl', componentFileName: 'admin-panel-discounts-control.component.html' },
        { url: '/signUp', componentFileName: 'client.component.html'},
        { url: '/signIn', componentFileName: 'client.component.html'}
    ]

    private async getComponentsInfo (startPath: string, components: IComponentInfo[]): Promise<IComponentInfo[]> {
        const fileNames: string[] = await fsPromises.readdir(startPath);

        for (const fileName of fileNames.filter(fileName => fileName !== 'node_modules' && !fileName.startsWith('.'))) {
            const fileFullPath = path.resolve(startPath, fileName);
            const fileStat = await fsPromises.stat(fileFullPath);

            if ( fileStat.isDirectory() ) {
                const subFolderPath = fileFullPath;

                await this.getComponentsInfo(subFolderPath, components);
            } else if ( fileName.endsWith('component.html') ) {
                const routesInfo = this.routes.filter(routeInfo => routeInfo.componentFileName === fileName);

                if ( routesInfo.length === 1) components.push({ url: routesInfo[0].url, changeTime: fileStat.ctime });
                else routesInfo.forEach(routeInfo => components.push({ url: routeInfo.url, changeTime: fileStat.ctime }));
            }
        }

        return components;
    }

    @Interval(10800000) // 3 hours
    public async createSitemap (): Promise<void> {
        const componentsInfo: IComponentInfo[] = await this.getComponentsInfo(path.join(process.cwd(), 'src'), [] as IComponentInfo[]);

const sitemap=`
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${
    componentsInfo.map(componentsInfo => `
    <url>
        <loc>${ process.env.SERVER_DOMAIN }${ componentsInfo.url }</loc>
        <changefreq>weekly</changefreq>
        <priority>1</priority>
        <lastmod>${ componentsInfo.changeTime.toISOString() }</lastmod>
    </url>    
`).join("")
}
</urlset>
    `;

        await fsPromises.writeFile(path.resolve(path.join(process.cwd(), 'dist/nest-ssr/browser'), 'sitemap.xml'), sitemap);
        await fsPromises.writeFile(path.resolve(path.join(process.cwd(), 'src'), 'sitemap.xml'), sitemap);
    }
}