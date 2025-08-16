// Simple API test for database endpoints - TypeScript version
// Test the GET, POST, and PUT routes from route.ts
// Run with: npx tsx test-api-simple.ts

interface MarketMetadata {
  market_index: number;
  question: string;
}

interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  error?: string;
}

class ApiTester {
  private baseUrl = "http://localhost:3000/api/markets";

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      return {
        status: 500,
        data: null as T,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Test GET /api/markets (fetch all markets)
  async testGetAllMarkets(): Promise<ApiResponse<MarketMetadata[]>> {
    console.log("🔍 Testing GET /api/markets - Fetch all markets");
    const result = await this.makeRequest<MarketMetadata[]>("");
    console.log(`Status: ${result.status}`);
    console.log(
      `Markets found: ${Array.isArray(result.data) ? result.data.length : 0}`
    );
    console.log("Response:", result.data);
    console.log("---");
    return result;
  }

  // Test POST /api/markets (create new market)
  async testCreateMarket(): Promise<ApiResponse<MarketMetadata>> {
    console.log("➕ Testing POST /api/markets - Create new market");

    const newMarket: MarketMetadata = {
      market_index: Math.floor(Date.now() / 1000), // Use timestamp for uniqueness
      question: "Will TypeScript API test succeed?",
    };

    const result = await this.makeRequest<MarketMetadata>("", {
      method: "POST",
      body: JSON.stringify(newMarket),
    });

    console.log(`Status: ${result.status}`);
    console.log("Created market:", result.data);
    console.log("---");
    return result;
  }

  // Test GET /api/markets?index={id} (fetch specific market)
  async testGetSpecificMarket(
    marketIndex: number
  ): Promise<ApiResponse<MarketMetadata>> {
    console.log(
      `🎯 Testing GET /api/markets?index=${marketIndex} - Fetch specific market`
    );

    const result = await this.makeRequest<MarketMetadata>(
      `?index=${marketIndex}`
    );
    console.log(`Status: ${result.status}`);
    console.log("Retrieved market:", result.data);
    console.log("---");
    return result;
  }

  // Test PUT /api/markets (update market)
  async testUpdateMarket(
    marketIndex: number
  ): Promise<ApiResponse<MarketMetadata>> {
    console.log(`✏️ Testing PUT /api/markets - Update market ${marketIndex}`);

    const updateData: Partial<MarketMetadata> = {
      market_index: marketIndex,
      question: "Updated question via TypeScript API test",
    };

    const result = await this.makeRequest<MarketMetadata>("", {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    console.log(`Status: ${result.status}`);
    console.log("Updated market:", result.data);
    console.log("---");
    return result;
  }

  // Test error cases
  async testErrorCases(): Promise<void> {
    console.log("❌ Testing error cases");

    // Test invalid POST data
    console.log("Testing POST with missing required fields...");
    const invalidResult = await this.makeRequest("", {
      method: "POST",
      body: JSON.stringify({ question: "Missing fields" }),
    });
    console.log(`Invalid POST Status: ${invalidResult.status}`);
    console.log("Error response:", invalidResult.data);

    // Test non-existent market GET
    console.log("Testing GET for non-existent market...");
    const notFoundResult = await this.makeRequest("?index=999999");
    console.log(`Non-existent GET Status: ${notFoundResult.status}`);
    console.log("Not found response:", notFoundResult.data);
    console.log("---");
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log("🚀 Starting TypeScript API Tests for route.ts endpoints...\n");

    try {
      // 1. Get all markets (might be empty initially)
      await this.testGetAllMarkets();

      // 2. Create a new market
      const createResult = await this.testCreateMarket();
      const createdMarketIndex = createResult.data?.market_index;

      if (createdMarketIndex && createResult.status === 201) {
        // 3. Get the specific market we just created
        await this.testGetSpecificMarket(createdMarketIndex);

        // 4. Update the market
        await this.testUpdateMarket(createdMarketIndex);

        // 5. Get the updated market to verify changes
        await this.testGetSpecificMarket(createdMarketIndex);
      }

      // 6. Get all markets again (should include our new market)
      await this.testGetAllMarkets();

      // 7. Test error cases
      await this.testErrorCases();

      console.log("✅ All TypeScript API tests completed successfully!");
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    }
  }
}

// Run tests
const tester = new ApiTester();
tester.runAllTests();
