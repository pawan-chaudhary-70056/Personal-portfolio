import type { AdminSkillCategory } from '@/@types/admin'
import {
  createSkillCategory,
  deleteSkillCategory,
  listSkillCategories,
  updateSkillCategory,
} from '@/api/categories.api'
import { CategoryManager } from '@/components/admin/CategoryManager'

export function AdminSkillCategoriesPage() {
  return (
    <CategoryManager
      title="Skill categories"
      description="Categories group skills on the public portfolio. Renaming one updates every skill that uses it, and a category that still groups skills cannot be deleted until they are reassigned."
      usageLabel="skills"
      load={listSkillCategories}
      create={createSkillCategory}
      update={updateSkillCategory}
      remove={deleteSkillCategory}
      countOf={(category: AdminSkillCategory) => category.skillCount}
    />
  )
}
