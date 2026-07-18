import { IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}

export class AddMemberDto {
  @IsString()
  userId: string;
}

export class AddExpenseDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  splitBetween: string[];

  @IsOptional()
  @IsString()
  paidBy?: string;
}

export class SendMessageDto {
  @IsString()
  content: string;
}
