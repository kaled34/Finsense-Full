import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsString()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  targetAmount: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class DepositGoalDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;
}
