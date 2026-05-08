import { PaginationDto } from './pagination.dto';

export const paginate = async <T>(
  model: {
    findMany: (args: any) => Promise<T[]>;
    count: (args: any) => Promise<number>;
  },
  dto: PaginationDto,
  args?: any,
) => {
  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip: dto.skip, take: dto.limit }),
    model.count({ where: args.where }),
  ]);

  return {
    data,
    meta: {
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit!),
    },
  };
};
