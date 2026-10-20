/**
 * Creates or updates the portfolio owner account.
 *
 * There is no public registration endpoint; this script is the provisioning
 * path. Credentials are read from the environment so they never appear in
 * shell history or source control.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' \
 *     npm run create-admin
 */
import { prisma } from '../db/prisma.js'
import { hashPassword } from '../lib/password.js'

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME?.trim() || 'Portfolio Owner'

async function main(): Promise<void> {
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.')
    process.exitCode = 1
    return
  }

  if (password.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.')
    process.exitCode = 1
    return
  }

  const passwordHash = await hashPassword(password)

  const admin = await prisma.admin.upsert({
    where: { email },
    create: { email, name, passwordHash },
    update: { name, passwordHash, isActive: true },
  })

  console.log(`Admin ready: ${admin.email} (id: ${admin.id})`)
}

main()
  .catch((error: unknown) => {
    console.error('Failed to create admin:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
