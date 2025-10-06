import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, profiles, licenses, guarantors } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      companyName,
      registrationNumber,
      taxId,
      contactEmail,
      contactPhone,
      address,
      licenseNumber,
      licenseType,
      issuingAuthority,
      expiryDate,
      licenseDocument,
      coverageTypes,
      maxCoverageAmount,
      guarantorName,
      guarantorEmail,
      guarantorPhone,
      guaranteeAmount,
      guarantorDocument,
      password
    } = body

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, contactEmail)).limit(1)
    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || 'defaultPassword123', 12)

    // Create user
    const [user] = await db.insert(users).values({
      email: contactEmail,
      password_hash: hashedPassword,
      role: 'insurance',
    }).returning()

    // Create profile
    await db.insert(profiles).values({
      user_id: user.id,
      organization_name: companyName,
      contact_info: JSON.stringify({
        email: contactEmail,
        phone: contactPhone,
        registrationNumber,
        taxId,
      }),
      address: JSON.stringify({
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      }),
    })

    // Create license
    if (licenseDocument) {
      await db.insert(licenses).values({
        user_id: user.id,
        type: licenseType,
        document_path: licenseDocument,
        expiry_date: new Date(expiryDate),
      })
    }

    // Create guarantor
    if (guarantorName) {
      await db.insert(guarantors).values({
        provider_id: user.id,
        name: guarantorName,
        contact_info: JSON.stringify({
          email: guarantorEmail,
          phone: guarantorPhone,
        }),
        guarantee_amount: guaranteeAmount.toString(),
      })
    }

    return NextResponse.json({
      message: 'Insurance company registration successful',
      userId: user.id,
      status: 'pending_verification'
    })

  } catch (error) {
    console.error('Insurance registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}