import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompressedImagesComponent } from './compressed-images.component';

describe('CompressedImagesComponent', () => {
    let component: CompressedImagesComponent;
    let fixture: ComponentFixture<CompressedImagesComponent>;

  beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CompressedImagesComponent]
        }).compileComponents();
    
        fixture = TestBed.createComponent(CompressedImagesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});