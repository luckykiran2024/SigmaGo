import { NextResponse } from 'next/server'
import { findOverdueSteps } from '@/lib/db/digest'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== "Bearer ${process.env.CRON_SECRET}") {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const overdueSteps = await findOverdueSteps()
    console.log("Found ${overdueSteps?.length || 0} overdue steps.")
    // Processing logic for escalation/nudge goes here

    return NextResponse.json({ success: true, count: overdueSteps?.length || 0 })
  } catch (error: any) {
    console.error("Nudge Cron Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
