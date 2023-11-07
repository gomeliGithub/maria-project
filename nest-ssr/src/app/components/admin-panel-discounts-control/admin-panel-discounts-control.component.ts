import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbCalendar, NgbDate, NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { IDiscount } from 'types/models';

@Component({
    selector: 'app-admin-panel-discounts-control',
    templateUrl: './admin-panel-discounts-control.component.html',
    styleUrls: ['./admin-panel-discounts-control.component.css']
})
export class AdminPanelDiscountsControlComponent implements OnInit {
    constructor (
        private readonly calendar: NgbCalendar,
        public readonly formatter: NgbDateParserFormatter,

        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService
    ) { 
        this.createDiscountForm = new FormGroup({
            'discountContent': new FormControl("", [ Validators.required, Validators.maxLength(50) ]),
            'discountExpirationDate': new FormControl("", Validators.required)
        });
    }

    @ViewChild('datepickerContainer', { static: false }) private readonly datepickerContainerViewRef: ElementRef<HTMLDivElement>;

    @HostListener('document:mousedown', [ '$event' ])
    public onGlobalClick (event): void {
        if ( !this.datepickerContainerViewRef.nativeElement.contains(event.target) ) {
            this.datepickerContainerIsHidden = true;

            if ( this.discountExpirationDateInputIsClicked ) this.discountExpirationDateInputIsClicked = !this.discountExpirationDateInputIsClicked;
            else if ( this.changeDiscountExpirationDateInputIsClicked ) this.changeDiscountExpirationDateInputIsClicked = !this.changeDiscountExpirationDateInputIsClicked;
        }
    }

    public createDiscountForm: FormGroup<{
        discountContent: FormControl<string>;
        discountExpirationDate: FormControl<string>;
    }>;

    public discountExpirationDateInputIsClicked: boolean = false;
    public changeDiscountExpirationDateInputIsClicked: boolean = false;

    public discounts: IDiscount[] = null;

    public datepickerContainerIsHidden: boolean = true;

    public hoveredDate: NgbDate | null = null;

    public fromDate: NgbDate | null;
	public toDate: NgbDate | null;

    public changeDiscountContentCheckBoxIsChecked: boolean = false;
    public changeDiscountExpirationDateCheckBoxIsChecked: boolean = false;

    public spinnerHidden: boolean = true;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.ADMINPANEL.DISCOUNTSCONTROL', true).subscribe(translation => this.appService.setTitle(translation));

            this.adminPanelService.getDiscountsData().subscribe(discounts => {
                if ( discounts.length !== 0 ) this.discounts = discounts;
            });
        }
    }

    public onDateSelection (date: NgbDate): void {
		if ( !this.fromDate && !this.toDate ) {
			this.fromDate = date;
		} else if ( this.fromDate && !this.toDate && date && date.after(this.fromDate) ) {
			this.toDate = date;
		} else {
			this.toDate = null;
			this.fromDate = date;
		}

        if ( this.discountExpirationDateInputIsClicked ) {
            this.createDiscountForm.controls.discountExpirationDate.setValue(`${ this.format(this.fromDate) } - ${ this.format(this.toDate) }`);
        } else if ( this.changeDiscountExpirationDateInputIsClicked ) {
            (document.querySelector('.changeDiscountExpirationDateInput') as HTMLInputElement).value = `${ this.format(this.fromDate) } - ${ this.format(this.toDate) }`;
        }
	}

    public isHovered (date: NgbDate): boolean {
		return (
			this.fromDate && !this.toDate && this.hoveredDate && date.after(this.fromDate) && date.before(this.hoveredDate)
		);
	}

	public isInside (date: NgbDate): boolean {
		return this.toDate && date.after(this.fromDate) && date.before(this.toDate);
	}

	public isRange (date: NgbDate): boolean {
		return (
			date.equals(this.fromDate) || (this.toDate && date.equals(this.toDate)) 
            || this.isInside(date) 
            || this.isHovered(date)
		);
	}

    public validateInput (currentValue: NgbDate | null, input: string): NgbDate | null {
		const parsed = this.formatter.parse(input);
		return parsed && this.calendar.isValid(NgbDate.from(parsed)) ? NgbDate.from(parsed) : currentValue;
	}

    public format (date: NgbDateStruct) {
        return this.formatter.format(date);
    }

    public discountExpirationDateClick (): void {
        this.datepickerContainerIsHidden = false;
        this.discountExpirationDateInputIsClicked = true;
    }

    public changeDiscountExpirationDateClick (): void {
        this.datepickerContainerIsHidden = false;
        this.changeDiscountExpirationDateInputIsClicked = true;
    }

    public changeDiscountContentCheckBoxChange (event: Event): void {
        const target: HTMLInputElement = event.target as HTMLInputElement;

        this.changeDiscountContentCheckBoxIsChecked = target.checked;
    }

    public changeDiscountExpirationDateCheckBoxChange (event: Event): void {
        const target: HTMLInputElement = event.target as HTMLInputElement;

        this.changeDiscountExpirationDateCheckBoxIsChecked = target.checked;
    }

    public createDiscount (): void {
        const { discountContent, discountExpirationDate } = this.createDiscountForm.value;

        let fromDate: Date = null; 
        let toDate: Date = null;

        discountExpirationDate.split(' - ').forEach(( dateString, index ) => {
            if ( index === 0 ) fromDate = new Date(dateString);
            else if ( index === 1 ) toDate = new Date(dateString);
        });

        this.adminPanelService.createDiscount(this, discountContent, fromDate, toDate);
    }

    public changeDiscountData (event: MouseEvent): void {
        const target: HTMLButtonElement = event.target as HTMLButtonElement;

        const discountId: number = parseInt(target.getAttribute('discount-id'), 10);

        if ( discountId ) {
            this.changeDiscountContentCheckBoxIsChecked = (document.querySelector('.changeDiscountContentCheckBox') as HTMLInputElement).checked;
            this.changeDiscountExpirationDateCheckBoxIsChecked = (document.querySelector('.changeDiscountExpirationDateCheckBox') as HTMLInputElement).checked;

            let newDiscountContent: string = null;
            let newFromDate: Date = null;
            let newToDate: Date = null;

            if ( this.changeDiscountContentCheckBoxIsChecked ) newDiscountContent = (document.querySelector('.changeDiscountContentInput') as HTMLTextAreaElement).value;
    
            const changeDiscountExpirationDateInputValue: string = (document.querySelector('.changeDiscountExpirationDateInput') as HTMLInputElement).value;

            if ( this.changeDiscountExpirationDateCheckBoxIsChecked ) changeDiscountExpirationDateInputValue.split(' - ').forEach(( dateString, index ) => {
                if ( index === 0 ) newFromDate = new Date(dateString);
                else if ( index === 1 ) newToDate = new Date(dateString);
            });

            if ( newDiscountContent && newDiscountContent.length > 50 ) this.appService.createWarningModal(this.appService.getTranslations('ADMINPANEL.CREATEDISCOUNTTEXT.INVALIDCONTENT'));
            else this.adminPanelService.changeDiscountData(this, newDiscountContent, newFromDate, newToDate, discountId);
        }
    }

    public deleteDiscount (event: MouseEvent): void {
        const target: HTMLButtonElement = event.target as HTMLButtonElement;

        const discountId: number = parseInt(target.getAttribute('discount-id'), 10);

        if ( discountId ) {
            this.adminPanelService.deleteDiscount(this, discountId);
        }
    }
}