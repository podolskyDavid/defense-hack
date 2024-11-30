import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { measurements } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPositionFromAcceleration } from '@/lib/position';

export async function GET() {
  try {
    // Get distinct session names
    const sessions = await db.selectDistinct({
      session_name: measurements.session_name
    }).from(measurements);

    // Get measurements for each session
    const paths = await Promise.all(
      sessions.map(async (session) => {
        const sessionMeasurements = await db
          .select()
          .from(measurements)
          .where(eq(measurements.session_name, session.session_name))
          .orderBy(measurements.timestamp);

        const positions = getPositionFromAcceleration(sessionMeasurements);

        return {
          session_name: session.session_name,
          positions,
        };
      })
    );

    return NextResponse.json(paths);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    );
  }
}
