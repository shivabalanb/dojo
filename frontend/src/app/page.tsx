import React from "react";

const App = () => {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Create a Market</h1>
      <button
        style={{ marginBottom: "20px", padding: "10px 20px", fontSize: "16px" }}
      >
        Connect Wallet
      </button>
      <form
        style={{ display: "flex", flexDirection: "column", maxWidth: "400px" }}
      >
        <label style={{ marginBottom: "10px" }}>
          Question:
          <input
            type="text"
            name="question"
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </label>
        <label style={{ marginBottom: "10px" }}>
          Category:
          <input
            type="text"
            name="category"
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </label>
        <label style={{ marginBottom: "10px" }}>
          Odds:
          <input
            type="text"
            name="odds"
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </label>
        <button
          type="submit"
          style={{ padding: "10px 20px", fontSize: "16px", marginTop: "20px" }}
        >
          Create Market
        </button>
      </form>
    </div>
  );
};

export default App;
