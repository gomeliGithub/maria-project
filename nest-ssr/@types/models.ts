import { Prisma, Admin, Member, CompressedImage, ImagePhotographyType, ClientOrder, Discount, JWT } from "@prisma/client";

export interface IAdmin extends Admin, Prisma.AdminGetPayload<{ include: { compressedImages: true } }> { }
export interface IAdminWithCompressedImagesCount extends Admin, Prisma.AdminGetPayload<{ include: { compressedImages: true, _count: { select: { compressedImages: true } } } }> { }
export interface IAdminWithoutRelationFields extends Admin { }

export interface IMember extends Member, Prisma.MemberGetPayload<{ include: { clientOrders: true } }> { }
export interface IMemberWithClientOrdersCount extends Member {
    _count: {
        clientOrders: number;
    };
}
export interface IMemberWithoutRelationFields extends Member { }

export interface ICompressedImage extends CompressedImage, Prisma.CompressedImageGetPayload<{ include: { admin: true } }> { }
export interface ICompressedImageWithoutRelationFields extends CompressedImage { }

export interface IImagePhotographyType extends ImagePhotographyType { }

export interface IClientOrder extends ClientOrder, Prisma.ClientOrderGetPayload<{ include: { member: true } }> { }
export interface IClientOrderWithoutRelationFields extends ClientOrder { }

export interface IDiscount extends Discount { }

export interface IJWT extends JWT { }