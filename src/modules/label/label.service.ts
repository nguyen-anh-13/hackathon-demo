import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabelEntity } from '../../entities/label.entity';
import { CreateLabelDto } from './dto/create-label.dto';
import { GetLabelsQueryDto } from './dto/get-labels-query.dto';
import { LabelListResponseDto } from './dto/label-list-response.dto';
import { LabelResponseDto } from './dto/label-response.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(LabelEntity)
    private readonly labelRepository: Repository<LabelEntity>
  ) {}

  async getAll(query: GetLabelsQueryDto): Promise<LabelListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.labelRepository
      .createQueryBuilder('label')
      .orderBy('label.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      qb.andWhere(
        '(LOWER(label.name_jp) LIKE LOWER(:search) OR LOWER(label.name_en) LIKE LOWER(:search))',
        { search: `%${query.search}%` }
      );
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((l) => this.toLabelResponse(l)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  async getOne(id: number): Promise<LabelResponseDto> {
    const label = await this.labelRepository.findOne({ where: { id } });
    if (!label) {
      throw new NotFoundException(`Label ${id} not found`);
    }
    return this.toLabelResponse(label);
  }

  async create(dto: CreateLabelDto): Promise<LabelResponseDto> {
    const entity = this.labelRepository.create({
      name_jp: dto.name_jp.trim(),
      name_en: dto.name_en.trim()
    });
    const saved = await this.labelRepository.save(entity);
    return this.toLabelResponse(saved);
  }

  async update(id: number, dto: UpdateLabelDto): Promise<LabelResponseDto> {
    if (dto.name_jp === undefined && dto.name_en === undefined) {
      throw new BadRequestException('Provide at least one of name_jp or name_en');
    }

    const label = await this.labelRepository.findOne({ where: { id } });
    if (!label) {
      throw new NotFoundException(`Label ${id} not found`);
    }

    if (dto.name_jp !== undefined) {
      label.name_jp = dto.name_jp.trim();
    }
    if (dto.name_en !== undefined) {
      label.name_en = dto.name_en.trim();
    }

    const saved = await this.labelRepository.save(label);
    return this.toLabelResponse(saved);
  }

  async remove(id: number): Promise<void> {
    const label = await this.labelRepository.findOne({ where: { id } });
    if (!label) {
      throw new NotFoundException(`Label ${id} not found`);
    }
    await this.labelRepository.remove(label);
  }

  private toLabelResponse(label: LabelEntity): LabelResponseDto {
    return {
      id: label.id,
      created_at: label.created_at,
      updated_at: label.updated_at,
      name_jp: label.name_jp,
      name_en: label.name_en
    };
  }
}
