import { Column, Model, Table, DataType, AutoIncrement, PrimaryKey, AllowNull } from 'sequelize-typescript';

@Table({
    timestamps: false
})
export class JWT_token extends Model {
    @AutoIncrement
    @PrimaryKey
    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    token_hash: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    issued_date: Date;

    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    expires_date: Date;

    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    revokation_date: Date;
}