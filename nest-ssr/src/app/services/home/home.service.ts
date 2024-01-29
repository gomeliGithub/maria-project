import { ElementRef, EventEmitter, Injectable, QueryList } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class HomeService {
    constructor () { }

    public activeScrollSnapSectionChange: EventEmitter<number> = new EventEmitter();
    public discountsDataIsExistsChange: EventEmitter<boolean> = new EventEmitter();

    public scrollSnapSectionViewRefsChange: EventEmitter<QueryList<ElementRef<HTMLDivElement>>> = new EventEmitter();

    public setActiveScrollSnapSection (value: number): void {
        this.activeScrollSnapSectionChange.emit(value);
    }

    public setDiscountsDataIsExists (value: boolean): void {
        this.discountsDataIsExistsChange.emit(value);
    }

    public setScrollSnapSectionViewRefs (value: QueryList<ElementRef<HTMLDivElement>>): void {
        this.scrollSnapSectionViewRefsChange.emit(value);
    }
}