import { ElementRef, EventEmitter, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

import { Client_order_status, Client_order_type, Image_display_type, Image_photography_type } from '@prisma/client';

import { Observable, map } from 'rxjs';

import { AdminPanelComponent } from '../../components/admin-panel/admin-panel.component';
import { AdminPanelOrdersControlComponent } from '../../components/admin-panel-orders-control/admin-panel-orders-control.component';
import { AdminPanelDiscountsControlComponent } from '../../components/admin-panel-discounts-control/admin-panel-discounts-control.component';
import { ClientOrdersComponent } from '../../components/admin-panel-orders-control/client-orders/client-orders.component';

import { AppService } from '../../app.service';
import { WebSocketService } from '../web-socket/web-socket.service';

import { environment } from '../../../environments/environment';

import { IClientOrdersData, IClientOrdersInfoData, IClientOrdersInfoDataArr, IFullCompressedImageData } from 'types/global';
import { IGetClientOrdersOptions, IGetFullCompressedImagesDataOptions, SortBy_Types } from 'types/options';
import { IClientOrderWithoutRelationFields, ICompressedImageWithoutRelationFields, IDiscount, IImagePhotographyType } from 'types/models';

@Injectable({
    providedIn: 'root'
})
export class AdminPanelService {
    private readonly _socketServerHost: string = environment.webSocketServerURL;

    constructor (
        private readonly _http: HttpClient,

        private readonly _appService: AppService,
        private readonly _webSocketService: WebSocketService
    ) { }

    public spinnerHiddenStatusChange: EventEmitter<boolean> = new EventEmitter();

    public setSpinnerHiddenStatus (value: boolean): void {
        this.spinnerHiddenStatusChange.emit(value);
    }

    public getFullCompressedImagesData (componentThis: AdminPanelComponent, isSearch: boolean, getParams: IGetFullCompressedImagesDataOptions, additionalImagesClick: boolean = false): void {
        if ( additionalImagesClick ) {
            this.checkChangesInPreviousPhotographyTypes(componentThis);
            this.checkChangesInPreviousDisplayTypes(componentThis);
        }

        let params: HttpParams = new HttpParams();

        if ( getParams ) {
            getParams.imagesLimit ? params = params.append('imagesLimit', getParams.imagesLimit) : undefined;
            getParams.imagesExistsCount ? params = params.append('imagesExistsCount', getParams.imagesExistsCount) : undefined;
            getParams.dateFrom ? params = params.append('dateFrom', getParams.dateFrom.toUTCString()) : undefined;
            getParams.dateUntil ? params = params.append('dateUntil', getParams.dateUntil.toUTCString()) : undefined;
            getParams.photographyTypes ? params = params.append('photographyTypes', JSON.stringify(getParams.photographyTypes)) : undefined;
            getParams.displayTypes ? params = params.append('displayTypes', JSON.stringify(getParams.displayTypes)) : undefined;
            params = params.append('sortBy', getParams.sortBy);
        }

        this._http.get<IFullCompressedImageData>('/api/admin-panel/getFullCompressedImagesList', { params, headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true }).subscribe({
            next: imageData => {
                if ( ( isSearch && ( !componentThis.previousPhotographyTypesNotChange || !componentThis.previousDisplayTypesNotChange ) ) || !componentThis.additionalImagesIsExists ) {
                    componentThis.fullCompressedImagesList = imageData.imagesList;

                    if ( componentThis.fullCompressedImagesList.length > 0 ) {
                        componentThis.compressedImageThumbnailUrls = [];
                        componentThis.compressedImageContainersAnimationCurrentStates = [];
                        componentThis.compressedImageContainersDeleteStatus = [];

                        componentThis.loadAndShowImageThumbnailRecursive(componentThis.fullCompressedImagesList, 0);
                    } else componentThis.changeDocumentBodyUserInteractions();

                    componentThis.fullCompressedImagesList.forEach(() => {
                        componentThis.compressedImageContainersAnimationCurrentStates.push('leave');
                        componentThis.compressedImageContainersDeleteStatus.push(false);
                    });

                    componentThis.compressedImagesContainerAnimationIsDone = false;

                    componentThis.changeImageDataForm = new FormGroup({
                        'newImagePhotographyType': new FormArray(componentThis.fullCompressedImagesList.map(data => {
                            componentThis.changeImageDataFormPreviousValues['newImagePhotographyType'].push(data.photographyType);

                            return new FormControl(data.photographyType);
                        })),
                        'newImageDisplayType': new FormArray(componentThis.fullCompressedImagesList.map(data => {
                            componentThis.changeImageDataFormPreviousValues['newImageDisplayType'].push(data.displayType);

                            return new FormControl(data.displayType);
                        })),
                        'newImageDescription': new FormArray(componentThis.fullCompressedImagesList.map(data => {
                            componentThis.changeImageDataFormPreviousValues['newImageDescription'].push(data.description);

                            return new FormControl(data.description);
                        }))
                    });

                    componentThis.fullCompressedImagesList.forEach(() => {
                        componentThis.changeImageDataFormSubmitButtonsHiddenStatus.push(true);
                        componentThis.compressedImageDataContainersAnimationCurrentStates.push('static');
                    });
                } else {
                    componentThis.compressedImageButtonsIsHidden = true;

                    componentThis.fullCompressedImagesList.push(...imageData.imagesList);

                    const newFullCompressedImagesList: ICompressedImageWithoutRelationFields[] = componentThis.fullCompressedImagesList.slice(getParams?.imagesExistsCount);

                    newFullCompressedImagesList.forEach(() => {
                        componentThis.compressedImageContainersAnimationCurrentStates.push('leave');
                        componentThis.compressedImageContainersDeleteStatus.push(false);
                    });

                    componentThis.compressedImagesContainerAnimationIsDone = false;

                    componentThis.loadAndShowImageThumbnailRecursive(newFullCompressedImagesList, 0);

                    imageData.imagesList.forEach(data => {
                        componentThis.changeImageDataFormPreviousValues['newImagePhotographyType'].push(data.photographyType);
                        componentThis.changeImageDataForm.controls.newImagePhotographyType.push(new FormControl(data.photographyType));

                        componentThis.changeImageDataFormPreviousValues['newImageDisplayType'].push(data.displayType);
                        componentThis.changeImageDataForm.controls.newImageDisplayType.push(new FormControl(data.displayType));

                        componentThis.changeImageDataFormPreviousValues['newImageDescription'].push(data.description);
                        componentThis.changeImageDataForm.controls.newImageDescription.push(new FormControl(data.description));
                    });

                    imageData.imagesList.forEach(() => {
                        componentThis.changeImageDataFormSubmitButtonsHiddenStatus.push(true);
                        componentThis.compressedImageDataContainersAnimationCurrentStates.push('static');
                    });
                }

                componentThis.fullCompressedImagesListCount = imageData.count;

                componentThis.additionalImagesIsExists = imageData.additionalImagesIsExists;

                componentThis.compressedImagesDataIsLoaded = true;
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public checkChangesInPreviousPhotographyTypes (componentThis: AdminPanelComponent): void {
        let result: boolean = false;

        if ( componentThis.previousPhotographyTypes.length !== 0 && componentThis.previousPhotographyTypes.length === componentThis.currentPhotographyTypes?.length ) {
            result = componentThis.previousPhotographyTypes.every(( data, index ) => data === ( componentThis.currentPhotographyTypes as Image_photography_type[] )[index]);
        } else result = false;

        componentThis.previousPhotographyTypesNotChange = result;
    }

    public checkChangesInPreviousDisplayTypes (componentThis: AdminPanelComponent): void {
        let result: boolean = false;

        if ( componentThis.previousDisplayTypes.length !== 0 && componentThis.previousDisplayTypes.length === componentThis.currentDisplayTypes?.length ) {
            result = componentThis.previousDisplayTypes.every(( data, index ) => data === ( componentThis.currentDisplayTypes as Image_display_type[] )[index]);
        } else result = false;

        componentThis.previousDisplayTypesNotChange = result;
    }

    public changeImageFormControlChange (componentThis: AdminPanelComponent, formArrayName: 'newImagePhotographyType' | 'newImageDisplayType' | 'newImageDescription', formControlIndex: number): void {
        const formArray: FormArray<FormControl<string>> = <FormArray<FormControl<Image_photography_type | Image_display_type | string>>>componentThis.changeImageDataForm.get(formArrayName);
        const control: FormControl<string> = formArray.at(formControlIndex);

        if ( componentThis.changeImageDataFormPreviousValues[formArrayName][formControlIndex] === control.value ) {
            componentThis.changeImageDataFormSubmitButtonsHiddenStatus[formControlIndex] = true;

            switch ( formArrayName ) {
                case 'newImagePhotographyType': { control.removeValidators([ Validators.required, componentThis.imagePhotographyTypeValidator ]); break; }
                case 'newImageDisplayType': { control.removeValidators([ Validators.required, componentThis.imageDisplayTypeValidator ]); break; }
                case 'newImageDescription': { control.removeValidators([ Validators.maxLength(20) ]); break; }
            }
        } else {
            componentThis.changeImageDataFormSubmitButtonsHiddenStatus[formControlIndex] = false;

            switch ( formArrayName ) {
                case 'newImagePhotographyType': { control.setValidators([ Validators.required, componentThis.imagePhotographyTypeValidator ]); break; }
                case 'newImageDisplayType': { control.setValidators([ Validators.required, componentThis.imageDisplayTypeValidator ]); break; }
                case 'newImageDescription': { control.setValidators([ Validators.maxLength(20) ]); break; }
            }
        }

        control.updateValueAndValidity();
    }

    public loadAndShowImageThumbnail (componentThis: AdminPanelComponent, imageButton: HTMLButtonElement | null, recursive: boolean, originalName?: string, compressedImagesList?: ICompressedImageWithoutRelationFields[], currentIndex?: number): void {
        const originalImageName: string | null = !originalName ? ( imageButton as HTMLButtonElement ).getAttribute('originalImageName') : originalName;

        if ( originalImageName !== null ) {
            componentThis.currentLoadedImageThumbnailOriginalName = originalImageName;
            componentThis.spinnerHidden = false;
    
            this._http.get('/api/admin-panel/getImageThumbnail', { 
                params: {
                    originalName: originalImageName
                },  headers: this._appService.createAuthHeaders() ?? { }, responseType: 'blob', withCredentials: true
            }).subscribe({
                next: imageThumbnailBlob => {
                    const reader = new FileReader();
    
                    reader.readAsDataURL(imageThumbnailBlob);
    
                    reader.onload = event => {
                        componentThis.spinnerHidden = true;
    
                        if ( !recursive ) {
                            componentThis.imageThumbnailUrl = ( event.target as FileReader ).result as string;
        
                            componentThis.imageThumbnailContainerIsVisible = true;
                                
                            componentThis.switchImageThumbnailContainerVisible();
                        } else {
                            componentThis.compressedImageThumbnailUrls.push(( event.target as FileReader ).result as string);
    
                            ( currentIndex as number ) += 1;
        
                            if ( ( currentIndex as number ) === compressedImagesList?.length ) {
                                componentThis.changeDocumentBodyUserInteractions();

                                return;
                            } else componentThis.loadAndShowImageThumbnailRecursive(compressedImagesList as ICompressedImageWithoutRelationFields[], currentIndex as number);
                        }
                    };   
                },
                error: () => {
                    componentThis.spinnerHidden = true;
    
                    this._appService.createErrorModal();
                }
            });
        }
    }

    public getClientOrders (options: IGetClientOrdersOptions): Observable<IClientOrdersData> {
        const params: HttpParams = this._createGetClientOrdersParams(options);

        return this._http.get<IClientOrdersData>('/api/admin-panel/getClientOrders', { params, headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true }).pipe(map(data => {
            ( data as IClientOrdersData ).orders = ( data as IClientOrdersData ).orders.map(clientOrder => {
                Object.keys(clientOrder).forEach(field => {
                    if ( field === 'createdDate' ) clientOrder[field] = new Date(clientOrder[field]);
                    if ( field === 'photographyType' ) switch ( clientOrder[field] ) {
                        case 'individual': { clientOrder[field] = this._appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.INDIVIDUAL'); break; }
                        case 'children': { clientOrder[field] = this._appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.CHILDREN'); break; }
                        case 'wedding': { clientOrder[field] = this._appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.WEDDING'); break; }
                        case 'family': { clientOrder[field] = this._appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.FAMILY'); break; }
                    }
                    if ( field === 'type') {
                        switch ( clientOrder[field] ) {
                            case 'consultation': { clientOrder[field] = this._appService.getTranslations('CLIENTORDERTYPES.CONSULTATION') as Client_order_type; break; }
                            case 'full': { clientOrder[field] = this._appService.getTranslations('CLIENTORDERTYPES.FULL') as Client_order_type; break; }
                        }
                    }
                    if ( field === 'status' ) switch ( clientOrder[field] ) {
                        case 'new': { clientOrder[field] = this._appService.getTranslations('CLIENTORDERSTATUSES.NEW') as Client_order_status; break; }
                        case 'processed': { clientOrder[field] = this._appService.getTranslations('CLIENTORDERSTATUSES.PROCESSED') as Client_order_status; break; }
                    }
                });

                return clientOrder;
            });
                
            return data;
        }));
    }

    public getClientOrdersInfoData (options: IGetClientOrdersOptions): Observable<IClientOrdersInfoData> {
        const params: HttpParams = this._createGetClientOrdersParams(options);

        return this._http.get<IClientOrdersInfoData>('/api/admin-panel/getClientOrdersInfoData', { params, headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true });
    }

    private _createGetClientOrdersParams (options: IGetClientOrdersOptions): HttpParams {
        let params: HttpParams = new HttpParams();

        if ( options ) {
            options.memberLogin ? params = params.append('memberLogin', options.memberLogin) : undefined;
            options.fromDate ? params = params.append('fromDate', options.fromDate.toDateString()) : undefined;
            options.untilDate ? params = params.append('untilDate', options.untilDate.toDateString()) : undefined;
            options.status ? params = params.append('status', options.status) : undefined;
            options.existsCount ? params = params.append('existsCount', options.existsCount) : undefined;
            options.ordersLimit ? params = params.append('ordersLimit', options.ordersLimit) : undefined;
        }

        return params;
    }
    
    public changeClientOrderStatus (clientOrderId: number, clientLogin: string): Observable<void> { 
        return this._http.put<void>('/api/admin-panel/changeClientOrderStatus', { adminPanel: {
            clientOrderId,
            clientLogin
        }} , { headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true });
    }

    public uploadImage (componentThis: AdminPanelComponent, imagePhotographyType: string | null | undefined, imageDisplayType: string | null | undefined, imageDescription: string | null | undefined, imageMetaJson: string): void {
        const newClientId: number = Math.random();
    
        this._http.post('/api/admin-panel/uploadImage', {
            client: {
                _id: newClientId, 
                uploadImageMeta: imageMetaJson,
                imagePhotographyType,
                imageDisplayType,
                imageDescription
            }
        }, { headers: this._appService.createAuthHeaders() || { }, responseType: 'text', withCredentials: true }).subscribe({
            next: result => {
                switch ( result ) {
                    case 'START': {
                        const reader = new FileReader();

                        reader.onload = event => {
                            const fileData: ArrayBuffer = ( event.target as FileReader ).result as ArrayBuffer;
                    
                            const slicedImageData: ArrayBuffer[] = [];
                    
                            for ( let i = 0; i <= fileData.byteLength; i += 100000 ) {
                                slicedImageData.push(fileData.slice(i, i + 100000));
                            } 
                    
                            this._webSocketService.on(this._socketServerHost, componentThis.uploadImageForm, slicedImageData, newClientId);
                        }
                    
                        reader.readAsArrayBuffer(componentThis.imageFile as File);

                        break;
                    }

                    case 'PENDING': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                    case 'FILEEXISTS': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                    case 'MAXCOUNT': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                    case 'MAXSIZE': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                    case 'MAXNAMELENGTH': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                }
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public deleteImage (componentThis: AdminPanelComponent, deleteImageButton: HTMLButtonElement, compressedImageIndex: number): void {
        const originalImageName: string | null = deleteImageButton.getAttribute('originalImageName');
        const imageIndexNumber: number = parseInt(deleteImageButton.getAttribute('image-index-number') as string, 10);

        if ( originalImageName !== null && !isNaN(imageIndexNumber) ) {
            componentThis.spinnerHidden = false;

            this._http.post('/api/admin-panel/deleteImage', {
                adminPanel: { originalImageName }
            }, { headers: this._appService.createAuthHeaders() || { }, responseType: 'text', withCredentials: true }).subscribe({
                next: responseText => {
                    this.switchImageControlResponses(responseText, 'delete');
                    componentThis.deleteImageIsCompleted = true;

                    componentThis.compressedImageContainersDeleteStatus[imageIndexNumber] = true;
                    componentThis.changeDetectorRef.detectChanges();

                    componentThis.fullCompressedImagesList.splice(imageIndexNumber, 1);
                    
                    Object.keys(componentThis.changeImageDataFormPreviousValues).forEach(controlName => componentThis.changeImageDataFormPreviousValues[controlName].splice(imageIndexNumber, 1));

                    componentThis.compressedImageThumbnailUrls.splice(compressedImageIndex, 1);
                    componentThis.compressedImageContainersAnimationCurrentStates.splice(compressedImageIndex, 1);
                    componentThis.changeImageDataFormSubmitButtonsHiddenStatus.splice(compressedImageIndex, 1);
                    componentThis.compressedImageDataContainersAnimationCurrentStates.splice(compressedImageIndex, 1);
                    componentThis.compressedImageContainersDeleteStatus.splice(compressedImageIndex, 1);
                },
                error: () => {
                    componentThis.spinnerHidden = true;

                    this._appService.createErrorModal();
                }
            });
        }
    }

    public changeImageDisplayTarget (componentThis: AdminPanelComponent, imageButton: HTMLButtonElement): void {
        const originalImageName: string | null = imageButton.getAttribute('originalImageName');
        const displayTargetPage: string | null = imageButton.getAttribute('targetPage');
        const imageIndexNumber: number = parseInt(imageButton.getAttribute('image-index-number') as string, 10);

        if ( originalImageName !== null && displayTargetPage !== null && !isNaN(imageIndexNumber) ) {
            componentThis.spinnerHidden = false;

            this._http.post('/api/admin-panel/changeImageDisplayTarget', {
                adminPanel: { originalImageName, displayTargetPage }
            }, { headers: this._appService.createAuthHeaders() || { }, responseType: 'text', withCredentials: true }).subscribe({
                next: responseText => {
                    this.switchImageControlResponses(responseText, 'changeDisplayTarget');

                    componentThis.fullCompressedImagesList[imageIndexNumber].displayedOnHomePage = false; // 0
                    componentThis.fullCompressedImagesList[imageIndexNumber].displayedOnGalleryPage = false; // 0

                    if ( responseText === 'SUCCESS' ) {
                        switch ( displayTargetPage ) {
                            case 'home': { componentThis.fullCompressedImagesList[imageIndexNumber].displayedOnHomePage = true; break; } // 1
                            case 'gallery': { componentThis.fullCompressedImagesList[imageIndexNumber].displayedOnGalleryPage = true; break; } // 1
                            case 'original': { break; }
                        }
                    }
                },
                error: () => {
                    componentThis.spinnerHidden = true;
                    
                    this._appService.createErrorModal();
                }
            });
        }
    }

    public changeImageData (componentThis: AdminPanelComponent, originalImageName: string): void {
        componentThis.spinnerHidden = false;

        const changeImageDataFormValue = componentThis.changeImageDataForm.value;
        const changedImageIndexNumber: number = componentThis.fullCompressedImagesList.findIndex(imageData => imageData.originalName == originalImageName);
        
        const previousImagePhotographyType: Image_photography_type = componentThis.changeImageDataFormPreviousValues['newImagePhotographyType'][changedImageIndexNumber] as Image_photography_type;
        const previousImageDisplayType: Image_display_type = componentThis.changeImageDataFormPreviousValues['newImageDisplayType'][changedImageIndexNumber] as Image_display_type;
        const previousImageDescription: string = componentThis.changeImageDataFormPreviousValues['newImageDescription'][changedImageIndexNumber] as string;

        let newImagePhotographyType: Image_photography_type | undefined = ( changeImageDataFormValue.newImagePhotographyType as ( Image_photography_type | null )[] ).at(changedImageIndexNumber) as Image_photography_type;
        let newImageDisplayType: Image_display_type | undefined = ( changeImageDataFormValue.newImageDisplayType as ( Image_display_type | null )[] ).at(changedImageIndexNumber) as Image_display_type;
        let newImageDescription: string | undefined = ( changeImageDataFormValue.newImageDescription as string[] ).at(changedImageIndexNumber) as string;

        newImagePhotographyType = previousImagePhotographyType !== newImagePhotographyType ? newImagePhotographyType : undefined;
        newImageDisplayType = previousImageDisplayType !== newImageDisplayType ? newImageDisplayType : undefined;
        newImageDescription = previousImageDescription !== newImageDescription ? newImageDescription : undefined;

        this._http.put('/api/admin-panel/changeImageData', {
            adminPanel: { originalImageName, newImagePhotographyType, newImageDescription, newImageDisplayType }
        }, { responseType: 'text', headers: this._appService.createAuthHeaders() || { }, withCredentials: true }).subscribe({
            next: responseText => {
                componentThis.spinnerHidden = true;

                this.switchImageControlResponses(responseText, 'changeData');

                let control: FormControl<Image_photography_type | Image_display_type | string | null> | null = null; componentThis.changeImageDataFormSubmitButtonsHiddenStatus

                if ( newImagePhotographyType && componentThis.fullCompressedImagesList[changedImageIndexNumber].photographyType !== newImagePhotographyType ) {
                    control = componentThis.changeImageDataForm.controls.newImagePhotographyType.at(changedImageIndexNumber) as FormControl<Image_photography_type>;

                    if ( control !== null ) {
                        control.removeValidators([ Validators.required, componentThis.imagePhotographyTypeValidator ]);
                        componentThis.fullCompressedImagesList[changedImageIndexNumber].photographyType = newImagePhotographyType as Image_photography_type;

                        ( componentThis.changeImageDataFormPreviousValues['newImagePhotographyType'][changedImageIndexNumber] as Image_photography_type ) = newImagePhotographyType;
                    }
                }

                if ( newImageDisplayType && componentThis.fullCompressedImagesList[changedImageIndexNumber].displayType !== newImageDisplayType ) {
                    control = componentThis.changeImageDataForm.controls.newImageDisplayType.at(changedImageIndexNumber) as FormControl<Image_display_type>;

                    if ( control !== null ) {
                        control.removeValidators([ Validators.required, componentThis.imageDisplayTypeValidator ]);
                        componentThis.fullCompressedImagesList[changedImageIndexNumber].displayType = newImageDisplayType as Image_display_type;

                        ( componentThis.changeImageDataFormPreviousValues['newImageDisplayType'][changedImageIndexNumber] as Image_display_type ) = newImageDisplayType as Image_display_type;
                    }
                }

                if ( newImageDescription && componentThis.fullCompressedImagesList[changedImageIndexNumber].description !== newImageDescription ) {
                    control = componentThis.changeImageDataForm.controls.newImageDescription.at(changedImageIndexNumber) as FormControl<string>;

                    if ( control !== null ) {
                        control.removeValidators([ Validators.maxLength(20) ]);
                        componentThis.fullCompressedImagesList[changedImageIndexNumber].description = newImageDescription;

                        ( componentThis.changeImageDataFormPreviousValues['newImageDescription'][changedImageIndexNumber] as string ) = newImageDescription;
                    }
                }

                componentThis.changeImageDataFormSubmitButtonsHiddenStatus[changedImageIndexNumber] = true;
            },
            error: () => {
                componentThis.spinnerHidden = true;

                this._appService.createErrorModal();
            }
        });
    }

    public setPhotographyTypeImage (componentThis: AdminPanelComponent, imageButton: HTMLButtonElement): void {
        const originalImageName: string | null = imageButton.getAttribute('originalImageName');
        const imagePhotographyType: string | null = imageButton.getAttribute('imagePhotographyType');

        if ( originalImageName !== null && imagePhotographyType !== null ) {
            componentThis.spinnerHidden = false;

            this._http.post('/api/admin-panel/setPhotographyTypeImage', {
                adminPanel: { originalImageName, imagePhotographyType }
            }, { responseType: 'text', headers: this._appService.createAuthHeaders() || { }, withCredentials: true }).subscribe({
                next: responseText => {
                    componentThis.spinnerHidden = true;

                    this.switchImageControlResponses(responseText, 'setPhotographyType');

                    const editedPhotographyTypeIndex: number = ( componentThis.imagePhotographyTypesData as IImagePhotographyType[]).findIndex(photographyTypeData => photographyTypeData.name === imagePhotographyType);
                    ( componentThis.imagePhotographyTypesData as IImagePhotographyType[])[editedPhotographyTypeIndex].compressedImageOriginalName = ( componentThis.fullCompressedImagesList.find(imageData => imageData.originalName === originalImageName) as ICompressedImageWithoutRelationFields).name;

                    componentThis.changeDetectorRef.detectChanges();
                },
                error: () => {
                    componentThis.spinnerHidden = true;
                    
                    this._appService.createErrorModal();
                }
            });
        }
    }

    public changePhotographyTypeDescription (componentThis: AdminPanelComponent, target: HTMLButtonElement): void {
        const photographyTypeName: string = target.getAttribute('photography-type-name') as string;

        if ( photographyTypeName ) {
            const photographyTypeNewDescription: string = ( componentThis.imagePhotographyTypeDescriptionViewRefs.find(imagePhotographyTypeDescription => {
                return imagePhotographyTypeDescription.nativeElement.getAttribute('photography-type-name') === photographyTypeName;
            }) as ElementRef<HTMLInputElement> ).nativeElement.value;

            if ( photographyTypeNewDescription.length <= 800 ) {
                componentThis.spinnerHidden = false;

                this._http.post<void>('/api/admin-panel/changePhotographyTypeDescription', {
                    adminPanel: { photographyTypeName, photographyTypeNewDescription }
                }, { headers: this._appService.createAuthHeaders() || { }, withCredentials: true }).subscribe({
                    next: () => {
                        componentThis.spinnerHidden = true;

                        const editedPhotographyTypeIndex: number = ( componentThis.imagePhotographyTypesData as IImagePhotographyType[] ).findIndex(photographyTypeData => photographyTypeData.name === photographyTypeName);
                        ( componentThis.imagePhotographyTypesData as IImagePhotographyType[] )[editedPhotographyTypeIndex].description = photographyTypeNewDescription;

                        componentThis.changeDetectorRef.detectChanges();

                        this._appService.createSuccessModal();
                    },
                    error: () => {
                        componentThis.spinnerHidden = true;
                        
                        this._appService.createErrorModal();
                    }
                });
            } else this._appService.createWarningModal(this._appService.getTranslations('ADMINPANEL.CHANGEPHOTOGRAPHYTYPEDESCRIPTIONBUTTONINVALIDMESSSAGE'));
        }
    }

    public searchImages (componentThis: AdminPanelComponent): void {
        componentThis.searchImagesForm.updateValueAndValidity();

        const { dateFrom, dateUntil, photographyTypes, displayTypes, sortBy } = componentThis.searchImagesForm.value;

        componentThis.currentDateFrom = new Date(dateFrom as string);
        componentThis.currentDateUntil = new Date(dateUntil as string);

        componentThis.currentPhotographyTypes = [];
        componentThis.currentDisplayTypes = [];

        ( photographyTypes as boolean[] ).forEach(( selected, index ) => selected === true ? ( componentThis.currentPhotographyTypes as Image_photography_type[] ).push(componentThis.imagePhotographyTypes[index]) : null);
        ( displayTypes as boolean[] ).forEach(( selected, index ) => selected === true ? ( componentThis.currentDisplayTypes as Image_display_type[] ).push(componentThis.imageDisplayTypes[index]) : null);

        this.checkChangesInPreviousPhotographyTypes(componentThis);
        this.checkChangesInPreviousDisplayTypes(componentThis);

        if ( !componentThis.previousPhotographyTypesNotChange ) componentThis.previousPhotographyTypes = componentThis.currentPhotographyTypes;
        if ( !componentThis.previousDisplayTypesNotChange ) componentThis.previousDisplayTypes = componentThis.currentDisplayTypes;
        
        if ( componentThis.currentPhotographyTypes.length === 0 ) componentThis.currentPhotographyTypes = undefined;
        if ( componentThis.currentDisplayTypes.length === 0 ) componentThis.currentDisplayTypes = undefined;

        componentThis.getFullCompressedImagesData(true, {
            dateFrom: componentThis.currentDateFrom, 
            dateUntil: componentThis.currentDateUntil,
            photographyTypes: componentThis.currentPhotographyTypes,
            displayTypes: componentThis.currentDisplayTypes,
            sortBy: sortBy as SortBy_Types
        });
    }

    public switchImageControlResponses (responseText: string, operationName: string): void {
        switch ( responseText ) {
            case 'SUCCESS': {
                this.setSpinnerHiddenStatus(true);

                if ( operationName !== 'delete' ) this._appService.createSuccessModal();
                
                break; 
            }

            case 'MAXCOUNT': {
                this.setSpinnerHiddenStatus(true);

                this._appService.createWarningModal(this._appService.getTranslations('ADMINPANEL.MAXCOUNTONHOMEPAGEMESSAGE')); 

                break;
            }

            case 'PENDING': {
                this.setSpinnerHiddenStatus(true);

                this._appService.createWarningModal(this._appService.getTranslations('UPLOADIMAGERESPONSES.PENDING')); 
                    
                break; 
            }

            case 'WRONGDISPLAYTYPE': {
                this.setSpinnerHiddenStatus(true);
                
                this._appService.createWarningModal(this._appService.getTranslations('UPLOADIMAGERESPONSES.WRONGDISPLAYTYPE')); 

                break;
            }
        }
    }

    public getNextClientOrdersInfoData (componentThis: AdminPanelOrdersControlComponent | ClientOrdersComponent, existsCountZero = false): void {
        let existsCount: number | null = null;

        if ( !componentThis.additionalOrdersInfoDataExists ) existsCount = 0;
        else existsCount = componentThis.getClientOrdersButtonViewRefs.length;

        if ( existsCountZero ) componentThis.additionalOrdersInfoDataExists = false;

        this.getClientOrdersInfoData({
            status: componentThis.currentSelectedOrdersStatusType,
            ordersLimit: 2,
            existsCount: existsCount
        }).subscribe({
            next: clientOrdersInfoData => {
                if ( !componentThis.additionalOrdersInfoDataExists
                    && (existsCountZero || componentThis.prevCurrentSelectedOrdersStatusType !== componentThis.currentSelectedOrdersStatusType) 
                ) componentThis.clientOrdersInfoData = clientOrdersInfoData.infoData && clientOrdersInfoData.infoData.length !== 0 ? clientOrdersInfoData.infoData : null;
                else ( componentThis.clientOrdersInfoData as IClientOrdersInfoDataArr[] ).push(...clientOrdersInfoData.infoData);

                componentThis.additionalOrdersInfoDataExists = clientOrdersInfoData.additionalOrdersInfoDataExists;
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public getNextClientOrdersData (componentThis: AdminPanelOrdersControlComponent | ClientOrdersComponent, event?: MouseEvent, existsCountZero = false) {
        const target: HTMLDivElement | null = event ? event.target as HTMLDivElement : null;

        let clientLogin: string | null = null;

        if ( existsCountZero && target !== null ) {
            clientLogin = target.getAttribute('client-login');

            componentThis.currentSelectedClientLogin = clientLogin !== 'guest' ? clientLogin as string : this._appService.getTranslations('ADMINPANEL.GUESTLOGINTEXT');
        }

        if ( !componentThis.currentSelectedClientLogin ) componentThis.currentSelectedClientLogin = this._appService.getTranslations('ADMINPANEL.GUESTLOGINTEXT');

        let memberLogin: string | null = null;
        let existsCount: number | null = null;

        if ( componentThis.currentSelectedClientLogin ) {
            memberLogin = existsCountZero ? clientLogin : componentThis.currentSelectedClientLogin === 'Гость' ? 'guest' : componentThis.currentSelectedClientLogin
        } else memberLogin = 'guest';

        if ( !componentThis.additionalOrdersExists ) existsCount = 0;
        else existsCount = componentThis.clientOrderViewRefs.length;

        if ( existsCountZero ) componentThis.additionalOrdersExists = false;

        this.getClientOrders({
            status: componentThis.currentSelectedOrdersStatusType,
            memberLogin: memberLogin as string,
            ordersLimit: 2,
            existsCount
        }).subscribe({
            next: clientOrdersData => {
                if ( !componentThis.additionalOrdersExists
                    && (existsCountZero || componentThis.prevCurrentSelectedOrdersStatusType !== componentThis.currentSelectedOrdersStatusType) 
                ) componentThis.clientOrders = clientOrdersData.orders && clientOrdersData.orders.length !== 0 ? clientOrdersData.orders : null;
                else ( componentThis.clientOrders as IClientOrderWithoutRelationFields[] ).push(...clientOrdersData.orders);

                componentThis.additionalOrdersExists = clientOrdersData.additionalOrdersExists;
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public getDiscountsData (): Observable<IDiscount[]> {
        return this._http.get<IDiscount[]>('/api/admin-panel/getDiscountsData', { headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true });
    }

    public createDiscount (componentThis: AdminPanelDiscountsControlComponent, discountContent: string, fromDate: Date, toDate: Date): void {
        componentThis.spinnerHidden = false;

        this._http.post('/api/admin-panel/createDiscount', { 
            adminPanel: {
                discountContent,
                fromDate,
                toDate
            }
        }, { responseType: 'text', headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true }).subscribe({
            next: responseText => {
                if ( responseText === 'MAXCOUNT' ) {
                    componentThis.spinnerHidden = true;

                    this._appService.createWarningModal(this._appService.getTranslations('ADMINPANEL.CHANGEDISCOUNTMAXCOUNTMESSAGE'));
                } else if ( responseText === 'SUCCESS' ) window.location.reload();
            },
            error: () => {
                componentThis.spinnerHidden = true;

                this._appService.createErrorModal()
            }
        });
    }

    public changeDiscountData (componentThis: AdminPanelDiscountsControlComponent, newDiscountContent: string, newFromDate: Date, newToDate: Date, discountId: number): void {
        componentThis.spinnerHidden = false;

        this._http.put<void>('/api/admin-panel/changeDiscountData', {
            adminPanel: {
                newDiscountContent,
                newFromDate,
                newToDate,
                discountId
            }
        }, { headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true }).subscribe({
            next: () => window.location.reload(),
            error: () => {
                componentThis.spinnerHidden = true;

                this._appService.createErrorModal()
            }
        });
    }

    public deleteDiscount (componentThis: AdminPanelDiscountsControlComponent, discountId: number): void {
        componentThis.spinnerHidden = false;

        this._http.delete<void>('/api/admin-panel/deleteDiscount', { 
            params: {
                discountId
            }, headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true
        }).subscribe({
            next: () => window.location.reload(),
            error: () => {
                componentThis.spinnerHidden = true;

                this._appService.createErrorModal()
            }
        });
    }
}