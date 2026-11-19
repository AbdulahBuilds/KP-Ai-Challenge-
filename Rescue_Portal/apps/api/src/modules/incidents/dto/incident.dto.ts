import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EmergencyType, Gender, Severity } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CAPABILITY_CATALOG } from '../../../common/constants/capabilities';

const capabilityCodes = CAPABILITY_CATALOG.map((c) => c.code);

export class PatientDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  patientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Symptoms or injury details' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  symptoms?: string;

  @ApiPropertyOptional({ description: 'Injury details (can be provided together with symptoms)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  injuries?: string;

  @ApiPropertyOptional({ description: "Patient's current condition" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  suspectedCondition?: string;

  @ApiPropertyOptional({ description: 'Additional emergency notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateIncidentDto {
  @ApiProperty({ enum: EmergencyType })
  @IsEnum(EmergencyType)
  emergencyType!: EmergencyType;

  @ApiProperty({ enum: Severity, description: 'Emergency severity/priority' })
  @IsEnum(Severity)
  severity!: Severity;

  @ApiProperty({ example: 31.5204, description: "Patient's current latitude" })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 74.3587, description: "Patient's current longitude" })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ description: "Patient's current location/address" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ type: [String], description: 'Required medical facilities or equipment capability codes' })
  @IsOptional()
  @IsArray()
  @IsIn(capabilityCodes, { each: true, message: 'Unknown capability code' })
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ type: PatientDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientDetailsDto)
  patient?: PatientDetailsDto;

  @ApiPropertyOptional({ description: 'Optional short case title' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;
}

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {}

export class IncidentListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pageSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
