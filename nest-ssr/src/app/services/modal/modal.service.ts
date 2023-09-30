import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    constructor () { }

    public changeProgressBar (progressElement: HTMLDivElement, percentUploaded: number, error = false): void {
        progressElement.setAttribute('aria-valuenow', percentUploaded.toString());

        const progressBarElement: HTMLDivElement = progressElement.children[0] as HTMLDivElement;

        progressBarElement.style.width = `${percentUploaded}%`;
        progressBarElement.textContent = `${percentUploaded}%`;

        if ( error ) {
            progressBarElement.classList.add('bg-danger');
            progressBarElement.textContent = "Произошла ошибка при загрузке файла на сервер";
        }
    }
}