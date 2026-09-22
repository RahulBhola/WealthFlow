export interface CategoryDto {
  id: string
  name: string
  colorTag?: string
  iconName?: string
  isSystem: boolean
  parentCategoryId?: string | null
  subcategories?: CategoryDto[]
}

export interface CreateCategoryPayload {
  name: string
  colorTag?: string
  iconName?: string
  parentCategoryId?: string
}
