import sequelize from 'sequelize';
import { Column, Model, Table, DataType, PrimaryKey, AllowNull, Default } from 'sequelize-typescript';

@Table({
    timestamps: false
})
export class JWT_token extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({ 
        type: DataType.STRING
    })
    token_hash: string;

    @Default(sequelize.literal('CURRENT_TIMESTAMP'))
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

    @Default(false)
    @AllowNull(false)
    @Column({ 
        type: DataType.BOOLEAN
    })
    revoked: boolean;
}