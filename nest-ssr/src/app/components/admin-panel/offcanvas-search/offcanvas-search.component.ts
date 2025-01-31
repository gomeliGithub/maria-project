import { Component, inject, Input, TemplateRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { Image_display_type, Image_photography_type } from '@prisma/client';

import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { SortBy_Types } from 'types/options';

@Component({
    selector: 'app-offcanvas-search',
    standalone: true,
    imports: [ CommonModule, ReactiveFormsModule, TranslateModule ],
    templateUrl: './offcanvas-search.component.html',
    styleUrl: './offcanvas-search.component.css',
    encapsulation: ViewEncapsulation.None,
})
export class OffcanvasSearchComponent {
    private _offcanvasService = inject(NgbOffcanvas);

    @Input() searchImagesForm: FormGroup<{
        dateFrom: FormControl<string | null>;
        dateUntil: FormControl<string | null>;
        photographyTypes: FormArray<FormControl<boolean>>;
        displayTypes: FormArray<FormControl<boolean>>;
        sortBy: FormControl<SortBy_Types>;
    }>;
    @Input() imagePhotographyTypes: Image_photography_type[];
    @Input() imageDisplayTypes: Image_display_type[];
    @Input() sortBy_TypesArr: SortBy_Types[];
    @Input() searchImagesMethod: { callParentMethod: () => void };
    @Input() searchImagesFormResetMethod: { callParentMethod: () => void };

    public openNoBackdrop (content: TemplateRef<any>): void {
		this._offcanvasService.open(content, { panelClass: 'searchImagesOffcanvas', backdrop: false });
	}

    public searchImages (): void {
        this.searchImagesMethod.callParentMethod();
    }

    public searchImagesFormReset (): void {
        this.searchImagesFormResetMethod.callParentMethod();
    }
}