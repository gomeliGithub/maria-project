import sequelize from 'sequelize';
import { Column, Model, Table, DataType, PrimaryKey, AllowNull, Default, CreatedAt, HasMany } from 'sequelize-typescript';

import { СompressedImage } from './image-control.model';

@Table({
    timestamps: false
})
export class Admin extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    login: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    password: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    fullName: string;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
    @CreatedAt
    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    signUpDate: Date;

    @HasMany(() => СompressedImage)
    compressedImages: СompressedImage[];
}

@Table({
    timestamps: false
})
export class Member extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    login: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    password: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    fullName: string;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
    @CreatedAt
    @Column({ 
        type: DataType.DATE
    })
    signUpDate: Date;

    @HasMany(() => СompressedImage)
    compressedImages: СompressedImage[];
}