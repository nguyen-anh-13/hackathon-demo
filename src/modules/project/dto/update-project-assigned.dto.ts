import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, ValidateIf } from 'class-validator';

export class UpdateProjectAssignedDto {
  @ApiProperty({
    nullable: true,
    description: 'Assignee internal id (`users.id`); send `null` to remove assignee'
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  assignedTo: number | null;
}
