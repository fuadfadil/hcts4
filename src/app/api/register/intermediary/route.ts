import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, profiles, licenses } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      isCompany,
      companyName,
      fullName,
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
      activityType,
      serviceDescription,
      experienceYears,
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
      role: 'intermediary',
    }).returning()

    // Create profile
    await db.insert(profiles).values({
      user_id: user.id,
      organization_name: isCompany ? companyName : fullName,
      contact_info: JSON.stringify({
        email: contactEmail,
        phone: contactPhone,
        registrationNumber,
        taxId,
        isCompany,
        activityType,
        experienceYears: parseInt(experienceYears),
        serviceDescription,
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

    return NextResponse.json({
      message: 'Intermediary registration successful',
      userId: user.id,
      status: 'pending_verification'
    })

  } catch (error) {
    console.error('Intermediary registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}