import { NextResponse } from "next/server";
import { getDataDir, listSymbols } from "@/lib/local-data";

const WAREHOUSE = process.env.WAREHOUSE_URL || "http://localhost:8020/api/v1";

export async function GET() {
  const dataDir = getDataDir();
  if (dataDir) {
    return NextResponse.json(listSymbols(dataDir));
  }

  try {
    const res = await fetch(`${WAREHOUSE}/data/symbols`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const symbols: string[] = await res.json();
      return NextResponse.json(symbols);
    }
  } catch {
    // warehouse not available
  }

  return NextResponse.json([]);
}
