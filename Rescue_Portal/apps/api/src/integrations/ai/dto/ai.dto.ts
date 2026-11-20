import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AiTextDto {
  @ApiProperty({ description: 'Incident narrative, symptoms, injuries or dispatch notes' })
  @IsString()
  @Length(3, 4000)
  text!: string;
}
