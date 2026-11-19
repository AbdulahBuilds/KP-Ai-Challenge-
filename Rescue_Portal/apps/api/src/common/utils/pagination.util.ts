export interface PaginationQuery {
  page?: number | string;
  pageSize?: number | string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function resolvePagination(query: PaginationQuery): { page: number; pageSize: number; skip: number; take: number } {
  const rawPage = Number(query.page ?? 1);
  const rawSize = Number(query.pageSize ?? 20);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawSize) && rawSize > 0 ? Math.min(Math.floor(rawSize), 100) : 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginationMeta(total: number, page: number, pageSize: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

export function paginated<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return { data, meta: buildPaginationMeta(total, page, pageSize) };
}
