import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({
    timestamps: false
})
export class JWT_tokens extends Model {
    @Column({ 
        type: DataType.STRING,
        primaryKey: true,
        allowNull: false
    })
    token_hash: string;

    @Column({ 
        type: DataType.DATE,
        allowNull: false
    })
    issued_date: Date;

    @Column({ 
        type: DataType.DATE,
        allowNull: false
    })
    expires_date: Date;

    @Column({ 
        type: DataType.DATE,
        allowNull: false
    })
    revokation_date: Date;
}