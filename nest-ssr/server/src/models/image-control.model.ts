import sequelize from 'sequelize';
import { Column, Model, Table, DataType, AutoIncrement, PrimaryKey, AllowNull, ForeignKey, BelongsTo, CreatedAt, Default, DeletedAt } from 'sequelize-typescript';

import { Admin, Member } from './client.model';

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
    imageNameDirPath: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    originalImageName: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    originalImageDirPath: string;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
    @CreatedAt
    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    creationDate: Date;

    @DeletedAt
    @AllowNull(true)
    @Column({ 
        type: DataType.DATE
    })
    deletionDate: Date;

    @ForeignKey(() => Admin)
    @ForeignKey(() => Member)
    @AllowNull(false)
    @Column({
        type: DataType.STRING
    })
    clientLogin: string;

    @BelongsTo(() => Admin)
    @BelongsTo(() => Member)
    client: Admin | Member;
}