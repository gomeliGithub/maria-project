import { Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgbModule, NgbSlideEvent } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';

import { AppService } from '../../app.service';

@Component({
    selector: 'app-prices',
    standalone: true,
    imports: [ CommonModule, NgbModule, TranslateModule ],
    templateUrl: './prices.component.html',
    styleUrl: './prices.component.css'
})
export class PricesComponent implements OnInit {
    public isCollapsed: boolean = true;

    public navbarElementRef: ElementRef<HTMLDivElement>;

    public ngbCarouselActiveId: number = 0;
    public ngbCarouselElementClassesdAreActive: boolean = false;

    constructor (
        private readonly _appService: AppService
    ) { }

    ngOnInit (): void {
        if ( this._appService.checkIsPlatformBrowser() ) {
            this._appService.getTranslations('PAGETITLES.PRICES', true).subscribe(translation => this._appService.setTitle(translation));
        }

        this.navbarElementRef.nativeElement.classList.remove('fixed-top');
        this.navbarElementRef.nativeElement.classList.add('sticky-bottom');
    }

    public beforeNgbCarouselSlide (event: NgbSlideEvent): void {
        this.ngbCarouselActiveId = parseInt(event.current.replace('ngb-slide-', ''), 10);

        if ( [ 2, 3 ].includes(this.ngbCarouselActiveId) ) {
            this.ngbCarouselElementClassesdAreActive = true;
        } else {
            this.ngbCarouselElementClassesdAreActive = false;
        }
    }
}