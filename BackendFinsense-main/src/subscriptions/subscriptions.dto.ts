import { IsString, IsNumber, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  name: string;

  @IsNumber()
  cost: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  @IsOptional()
  billingCycle?: string;

  @IsDateString()
  nextBillingDate: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;
}

export class UpdateSubscriptionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  @IsOptional()
  billingCycle?: string;

  @IsDateString()
  @IsOptional()
  nextBillingDate?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsString()
  @IsIn(['active', 'paused', 'cancelled'])
  @IsOptional()
  status?: string;
}
