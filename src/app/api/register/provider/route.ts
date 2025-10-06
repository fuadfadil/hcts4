import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, profiles, licenses, guarantors, medicalUnits } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      organizationName,
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
      guarantorName,
      guarantorEmail,
      guarantorPhone,
      guaranteeAmount,
      guarantorDocument,
      icd11Codes,
      specialties,
      serviceDescription,
      password // Assuming password is provided from a separate auth flow
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
      role: 'provider',
    }).returning()

    // Create profile
    await db.insert(profiles).values({
      user_id: user.id,
      organization_name: organizationName,
      contact_info: {
        email: contactEmail,
        phone: contactPhone,
        registrationNumber,
        taxId,
      },
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
    })

    // Create license
    if (licenseDocument) {
      await db.insert(licenses).values({
        user_id: user.id,
        type: licenseType,
        document_path: licenseDocument, // In real app, this would be uploaded to cloud storage
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

    // Create medical units based on ICD11 codes
    if (icd11Codes && Array.isArray(icd11Codes)) {
      for (const code of icd11Codes) {
        await db.insert(medicalUnits).values({
          provider_id: user.id,
          name: `${organizationName} - ${code}`,
          description: serviceDescription,
          icd11_code: code,
          base_price: '0', // Default price, can be updated later
        })
      }
    }

    return NextResponse.json({
      message: 'Provider registration successful',
      userId: user.id,
      status: 'pending_verification'
    })

  } catch (error) {
    console.error('Provider registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}