import type { AdminProjectCategory } from '@/@types/admin'
import {
  createProjectCategory,
  deleteProjectCategory,
  listProjectCategories,
  updateProjectCategory,
} from '@/api/categories.api'
import { CategoryManager } from '@/components/admin/CategoryManager'

export function AdminProjectCategoriesPage() {
  return (
    <CategoryManager
      title="Project categories"
      description="Categories group projects on the public portfolio. Renaming one updates every project that uses it, and a category that still groups projects cannot be deleted until they are reassigned."
      usageLabel="projects"
      load={listProjectCategories}
      create={createProjectCategory}
      update={updateProjectCategory}
      remove={deleteProjectCategory}
      countOf={(category: AdminProjectCategory) => category.projectCount}
    />
  )
}
