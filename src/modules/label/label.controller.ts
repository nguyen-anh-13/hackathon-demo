import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLabelDto } from './dto/create-label.dto';
import { GetLabelsQueryDto } from './dto/get-labels-query.dto';
import { LabelListResponseDto } from './dto/label-list-response.dto';
import { LabelResponseDto } from './dto/label-response.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelService } from './label.service';

@ApiTags('labels')
@Controller('labels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Get()
  @ApiOperation({
    summary: 'List labels',
    description: 'Returns a paginated list of labels. Use `search` to filter by nameJp or nameEn.'
  })
  @ApiOkResponse({ type: LabelListResponseDto })
  getAll(@Query() query: GetLabelsQueryDto): Promise<LabelListResponseDto> {
    return this.labelService.getAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get label by id' })
  @ApiOkResponse({ type: LabelResponseDto })
  getOne(@Param('id', ParseIntPipe) id: number): Promise<LabelResponseDto> {
    return this.labelService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create label' })
  @ApiCreatedResponse({ type: LabelResponseDto })
  create(@Body() body: CreateLabelDto): Promise<LabelResponseDto> {
    return this.labelService.create(body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update label',
    description: 'Provide at least one of `nameJp` or `nameEn`.'
  })
  @ApiOkResponse({ type: LabelResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLabelDto
  ): Promise<LabelResponseDto> {
    return this.labelService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete label' })
  @ApiNoContentResponse({ description: 'Label deleted' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.labelService.remove(id);
  }
}
