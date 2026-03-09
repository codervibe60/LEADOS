import { NextResponse } from 'next/server';
import { getDataSourceStatus } from '../../../../../backend/data-sources';

// GET /api/settings/data-sources — check which data sources are configured
export async function GET() {
  const status = getDataSourceStatus();
  return NextResponse.json(status);
}
