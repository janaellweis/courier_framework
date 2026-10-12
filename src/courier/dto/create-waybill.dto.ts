import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class AddressDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}

class ContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

class PackageDto {
  @IsNumber()
  @IsPositive()
  weightKg: number;
}

export class CreateWaybillDto {
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ValidateNested()
  @Type(() => ContactDto)
  sender: ContactDto;

  @ValidateNested()
  @Type(() => ContactDto)
  recipient: ContactDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageDto)
  packages: PackageDto[];
}
