import { NextResponse } from 'next/server'
import { getDigestPayload } from '@/lib/db/digest'
import { verifyCronAuthorization } from '@/lib/security/cronAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authResult = verifyCronAuthorization(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.reason || 'Unauthorized' }, { status: 401 })
    }

    const payload = await getDigestPayload()
    console.log("Digest payload:", payload)
    // Emailing logic goes here

    return NextResponse.json({ success: true, count: payload?.length || 0 })
  } catch (error: any) {
    console.error("Digest Cron Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
