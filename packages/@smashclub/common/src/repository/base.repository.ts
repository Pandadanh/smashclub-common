import { PaginatedResult, PaginationParams, DEFAULT_PAGINATION } from '../types/pagination.type';

/**
 * Base repository interface for common CRUD operations
 */
export interface IBaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  findMany(params: PaginationParams): Promise<PaginatedResult<T>>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
  exists(id: ID): Promise<boolean>;
}

/**
 * Base entity interface
 */
export interface IBaseEntity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Soft-deletable entity interface
 */
export interface ISoftDeletable {
  isDeleted: boolean;
  deletedAt?: Date;
}

/**
 * Activatable entity interface
 */
export interface IActivatable {
  isActive: boolean;
}

/**
 * Auditable entity interface
 */
export interface IAuditable {
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Calculate pagination values
 */
export function calculatePagination(params: PaginationParams): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = Math.max(1, params.page || DEFAULT_PAGINATION.PAGE);
  const limit = Math.min(
    params.limit || DEFAULT_PAGINATION.LIMIT,
    DEFAULT_PAGINATION.MAX_LIMIT,
  );
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

/**
 * Create paginated result from data and count
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

