import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await prisma.countryData.findMany({
      orderBy: { countryName: 'asc' },
    });

    // Serialise BigInt population to number for JSON
    const serialised = rows.map((r) => ({
      ...r,
      population: r.population ? Number(r.population) : null,
    }));

    return NextResponse.json(serialised, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (err) {
    console.error('[country-data] Error:', err);
    return NextResponse.json({ error: 'Failed to load country data' }, { status: 500 });
  }
}
