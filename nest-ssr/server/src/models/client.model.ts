import sequelize from 'sequelize';
import { Column, Model, Table, DataType, PrimaryKey, AllowNull, Default, CreatedAt, HasMany, AutoIncrement, DeletedAt, ForeignKey, BelongsTo } from 'sequelize-typescript';

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
    type: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    fullName: string;

    @AllowNull(true)
    @Column({ 
        type: DataType.STRING
    })
    email: string;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
    @CreatedAt
    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    signUpDate: Date;

    @AllowNull(true)
    @Column({ 
        type: DataType.DATE
    })
    lastSignInDate: Date;

    @AllowNull(true)
    @Column({ 
        type: DataType.DATE
    })
    lastActiveDate: Date;

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
    type: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    fullName: string;

    @AllowNull(true)
    @Column({ 
        type: DataType.STRING
    })
    email: string;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
    @CreatedAt
    @Column({ 
        type: DataType.DATE
    })
    signUpDate: Date;

    @AllowNull(true)
    @Column({ 
        type: DataType.DATE
    })
    lastSignInDate: Date;

    @AllowNull(true)
    @Column({ 
        type: DataType.DATE
    })
    lastActiveDate: Date;

    @HasMany(() => СompressedImage)
    compressedImages: СompressedImage[];
}

@Table({
    timestamps: false
})
export class СompressedImage extends Model {
    @AutoIncrement
    @PrimaryKey
    @AllowNull(false)
    @Column({ 
        type: DataType.INTEGER
    })
    id: number;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    imageName: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    imageDirPath: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    originalName: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    originalDirPath: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.INTEGER
    })
    originalSize: number;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
    @CreatedAt
    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    uploadDate: Date;

    @DeletedAt
    @AllowNull(true)
    @Column({ 
        type: DataType.DATE
    })
    deletionDate: Date;

    @Default(false)
    @AllowNull(false)
    @Column({ 
        type: DataType.BOOLEAN
    })
    displayedOnHomePage: boolean;

    @Default(false)
    @AllowNull(false)
    @Column({ 
        type: DataType.BOOLEAN
    })
    displayedOnGalleryPage: boolean;

    @ForeignKey(() => Admin)
    @AllowNull(true)
    @Column({
        type: DataType.STRING
    })
    adminLogin: string;

    @ForeignKey(() => Member)
    @AllowNull(true)
    @Column({
        type: DataType.STRING
    })
    memberLogin: string;

    @BelongsTo(() => Admin)
    admin: Admin;

    @BelongsTo(() => Member)
    member: Member;
}