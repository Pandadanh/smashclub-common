import { DEFAULT_PAGINATION } from '../types/pagination.type';

/**
 * Pagination query DTO
 */
export class PaginationQueryDto {
  page?: number = DEFAULT_PAGINATION.PAGE;
  limit?: number = DEFAULT_PAGINATION.LIMIT;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' = 'desc';

  /**
   * Get skip value for database query
   */
  getSkip(): number {
    const page = Math.max(1, this.page || DEFAULT_PAGINATION.PAGE);
    const limit = Math.min(
      this.limit || DEFAULT_PAGINATION.LIMIT,
      DEFAULT_PAGINATION.MAX_LIMIT,
    );
    return (page - 1) * limit;
  }

  /**
   * Get take value for database query
   */
  getTake(): number {
    return Math.min(
      this.limit || DEFAULT_PAGINATION.LIMIT,
      DEFAULT_PAGINATION.MAX_LIMIT,
    );
  }
}

/**
 * Paginated response DTO
 */
export class PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }

  static create<T>(
    data: T[],
    total: number,
    pagination: PaginationQueryDto,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto(
      data,
      total,
      pagination.page || DEFAULT_PAGINATION.PAGE,
      pagination.getTake(),
    );
  }
}

