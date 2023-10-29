import sequelize from 'sequelize';
import { Column, Model, Table, DataType, PrimaryKey, AllowNull, Default, CreatedAt, HasMany, ForeignKey, BelongsTo, AutoIncrement } from 'sequelize-typescript';

@Table({
    timestamps: false
})
export class Admin extends Model {
    @PrimaryKey
    @AutoIncrement
    @AllowNull(false)
    @Column({ 
        type: DataType.INTEGER
    })
    id: number;

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

    @HasMany(() => ClientCompressedImage)
    compressedImages: ClientCompressedImage[];
}

@Table({
    timestamps: false
})
export class Member extends Model {
    @PrimaryKey
    @AutoIncrement
    @AllowNull(false)
    @Column({ 
        type: DataType.INTEGER
    })
    id: number;

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
    @AllowNull(false)
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

    @HasMany(() => ClientOrder)
    clientOrders: ClientOrder[];
}

@Table({
    timestamps: false
})
export class ClientCompressedImage extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    name: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    dirPath: string;

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

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    photographyType: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    viewSizeType: string;

    @AllowNull(true)
    @Column({ 
        type: DataType.STRING
    })
    description: string;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
    @CreatedAt
    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    uploadDate: Date;

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
        type: DataType.INTEGER
    })
    adminLoginId: number;

    @BelongsTo(() => Admin)
    admin: Admin;
}

@Table({
    timestamps: false
})
export class ImagePhotographyType extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    name: string;

    @AllowNull(true)
    @Column({ 
        type: DataType.STRING
    })
    description: string;

    @AllowNull(true)
    @Column({ 
        type: DataType.STRING
    })
    originalImageName: string;
}

@Table({
    timestamps: false
})
export class ClientOrder extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({ 
        type: DataType.BIGINT.UNSIGNED
    })
    id: number;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    photographyType: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    type: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    phoneNumber: string;

    @AllowNull(true)
    @Column({ 
        type: DataType.STRING
    })
    comment: string;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
    @AllowNull(false)
    @CreatedAt
    @Column({ 
        type: DataType.DATE
    })
    createdDate: Date;

    @Default('new')
    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    status: string;

    @ForeignKey(() => Member)
    @AllowNull(true)
    @Column({
        type: DataType.INTEGER
    })
    memberLoginId: number;

    @BelongsTo(() => Member)
    member: Member;
}