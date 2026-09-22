import { apiClient } from '@/lib/api'
import type { CategoryDto, CreateCategoryPayload } from '../types'

export const categoriesApi = {
  async getCategories(): Promise<CategoryDto[]> {
    return apiClient<CategoryDto[]>('/api/v1/categories')
  },

  async createCategory(payload: CreateCategoryPayload): Promise<CategoryDto> {
    return apiClient<CategoryDto>('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
