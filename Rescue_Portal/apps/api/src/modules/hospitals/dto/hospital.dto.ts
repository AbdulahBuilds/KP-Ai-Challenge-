import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HospitalSearchQueryDto {
  @ApiProperty({ example: 31.5204 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 74.3587 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ default: 25 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  radiusKm?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}

export class HospitalDirectoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}

export class CreateHospitalRequestDto {
  @ApiProperty()
  @IsString()
  @Length(1, 120)
  hospitalExternalId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  hospitalName!: string;

  @ApiPropertyOptional({ description: 'Estimated arrival time in minutes, if available' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  etaMinutes?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @IsOptional()
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Client-supplied idempotency key' })
  @IsOptional()
  @IsString()
  @Length(8, 160)
  idempotencyKey?: string;
}

export class UpdateHospitalRequestEtaDto {
  @ApiProperty({ example: 12, description: 'Estimated arrival time in minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  etaMinutes!: number;
}

export class SelectHospitalDto {
  @ApiProperty()
  @IsUUID()
  incidentId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 120)
  hospitalExternalId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  hospitalName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  recommendationId?: string;

  @ApiPropertyOptional({ description: 'Reason for selecting or changing destination' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Compatibility field for override reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}
