import { Column, Model, Table, DataType, AutoIncrement, PrimaryKey, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';

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

    







    @ForeignKey(() => Admin)
    @ForeignKey(() => Member)
    @AllowNull(false)
    @Column({
        type: DataType.INTEGER
    })
    clientId: number;

    @BelongsTo(() => Admin)
    @BelongsTo(() => Member)
    client: Member;
}