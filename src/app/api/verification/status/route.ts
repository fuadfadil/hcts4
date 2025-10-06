import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, licenses } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user verification status
    const user = await db.select().from(users).where(eq(users.id, parseInt(userId))).limit(1)

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get license verification status
    const licensesData = await db.select().from(licenses).where(eq(licenses.user_id, parseInt(userId)))

    const licenseStatus = licensesData.length > 0
      ? licensesData.every(license => license.verification_status === 'verified')
        ? 'verified'
        : licensesData.some(license => license.verification_status === 'rejected')
        ? 'rejected'
        : 'pending'
      : 'pending'

    const overallStatus = user[0].is_verified ? 'verified' : licenseStatus

    return NextResponse.json({
      userId: parseInt(userId),
      emailVerified: user[0].is_verified,
      licenseStatus,
      overallStatus,
      licenses: licensesData.map(license => ({
        id: license.id,
        type: license.type,
        status: license.verification_status,
        expiryDate: license.expiry_date,
      })),
      message: overallStatus === 'verified'
        ? 'Your account has been verified and is ready to use.'
        : overallStatus === 'pending'
        ? 'Your verification is being processed. Please check back later.'
        : 'Your verification was rejected. Please contact support for more information.'
    })

  } catch (error) {
    console.error('Verification status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}