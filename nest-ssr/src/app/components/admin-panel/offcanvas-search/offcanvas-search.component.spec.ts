import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffcanvasSearchComponent } from './offcanvas-search.component';

describe('OffcanvasSearchComponent', () => {
    let component: OffcanvasSearchComponent;
    let fixture: ComponentFixture<OffcanvasSearchComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OffcanvasSearchComponent]
        }).compileComponents();
    
        fixture = TestBed.createComponent(OffcanvasSearchComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});