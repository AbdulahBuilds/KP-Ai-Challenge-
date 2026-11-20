import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateRecommendationsDto {
  @ApiPropertyOptional({ type: [String], description: 'Override required capabilities for this evaluation' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ default: 30, description: 'Search radius around the patient location (km)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  searchRadiusKm?: number;
}

export class SelectRecommendationDto {
  @ApiProperty()
  @IsString()
  @Length(1, 120)
  hospitalExternalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  hospitalName?: string;

  @ApiPropertyOptional({ description: 'Reason for selection or destination change' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Compatibility field for reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}
