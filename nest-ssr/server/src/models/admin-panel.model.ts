import { AllowNull, Column, DataType, Model, PrimaryKey, Table } from "sequelize-typescript";

@Table({
    timestamps: false
})
export class Discount extends Model {
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
    content: string;

    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    expirationFromDate: Date;

    @AllowNull(false)
    @Column({ 
        type: DataType.DATE
    })
    expirationToDate: Date;
}