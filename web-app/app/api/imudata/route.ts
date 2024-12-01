import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'mag_mapping_public_measurements.csv');
    const fileContents = fs.readFileSync(filePath, 'utf8');

    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: 'Failed to load data' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}