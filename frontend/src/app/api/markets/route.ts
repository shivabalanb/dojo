import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  user: "shivabalathandayuthapani",
  host: "localhost",
  database: "market_data",
  password: "",
  port: parseInt("5432"),
});

console.log("📊 Database connection configured for market_data");

export interface MarketMetadata {
  market_index: number;
  question: string;
}

// GET - Fetch all markets or specific market by index
export async function GET(req: NextRequest) {
  console.log("🔍 GET /api/markets called");
  const { searchParams } = new URL(req.url);
  const marketIndex = searchParams.get("index");
  console.log("📍 Market index requested:", marketIndex || "all markets");

  try {
    if (marketIndex) {
      // Get specific market by index
      const result = await pool.query(
        "SELECT * FROM markets WHERE market_index = $1",
        [parseInt(marketIndex)]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Market not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    } else {
      // Get all markets
      const result = await pool.query(
        "SELECT * FROM markets ORDER BY market_index ASC"
      );
      return NextResponse.json(result.rows);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Store new market metadata after on-chain creation
export async function POST(req: NextRequest) {
  console.log("➕ POST /api/markets called");
  try {
    const { market_index, question }: MarketMetadata = await req.json();

    console.log("📝 Creating market with data:", {
      market_index,
      question,
    });

    // Validate required fields
    if (market_index === undefined || market_index === null || !question) {
      console.error("Validation failed:", { market_index, question });
      return NextResponse.json(
        {
          error: "Missing required fields: market_index, question",
          received: { market_index, question },
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO markets (market_index, question) VALUES ($1, $2) 
       ON CONFLICT (market_index) 
       DO UPDATE SET question = EXCLUDED.question
       RETURNING *`,
      [market_index, question]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("Database error:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        details: err,
      },
      { status: 500 }
    );
  }
}

// PUT - Update market metadata
export async function PUT(req: NextRequest) {
  try {
    const { market_index, question }: Partial<MarketMetadata> =
      await req.json();

    if (!market_index) {
      return NextResponse.json(
        { error: "market_index is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE markets SET question = COALESCE($2, question) WHERE market_index = $1 RETURNING *`,
      [market_index, question]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
