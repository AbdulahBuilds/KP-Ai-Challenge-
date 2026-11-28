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

  @ApiPropertyOptional({ description: 'Treatment already provided by the rescue team' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  treatmentProvided?: string;

  @ApiPropertyOptional({ description: 'Additional emergency notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateIncidentDto {
  @ApiPropertyOptional({
    description:
      'One free-text patient narrative. The backend AI extracts emergency type, severity, patient details, required facilities and equipment from it.',
    maxLength: 8000,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  narrative?: string;

  @ApiPropertyOptional({
    enum: ['en', 'ur', 'ps'],
    description: 'Spoken language hint. Omit it to auto-detect from the narrative.',
  })
  @IsOptional()
  @IsIn(['en', 'ur', 'ps'])
  language?: 'en' | 'ur' | 'ps';

  @ApiPropertyOptional({ enum: EmergencyType, description: 'Optional override; normally detected from the narrative by AI.' })
  @IsOptional()
  @IsEnum(EmergencyType)
  emergencyType?: EmergencyType;

  @ApiPropertyOptional({ enum: Severity, description: 'Optional override; normally detected from the narrative by AI.' })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

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

export class StructureIncidentNarrativeDto {
  @ApiProperty({ maxLength: 8000 })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  transcript!: string;

  @ApiPropertyOptional({ enum: ['en', 'ur', 'ps'], description: 'Optional; omitted values are auto-detected.' })
  @IsOptional()
  @IsIn(['en', 'ur', 'ps'])
  language?: 'en' | 'ur' | 'ps';
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
