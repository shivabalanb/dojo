"use client";
import React from "react";

const App = () => {
  return (
    <div
      style={{
        display: "flex",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "1000px",
        margin: "0 auto",
        backgroundColor: "#f4f4f9",
        minHeight: "100vh",
        alignItems: "center",
      }}
    >
      <div
        style={{
          flex: 1,
          marginRight: "20px",
          backgroundColor: "#e0e0eb",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ textAlign: "center", color: "#333" }}>
          Available Markets
        </h2>
        <div
          style={{
            backgroundColor: "#fff",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            marginBottom: "10px",
          }}
        >
          <p style={{ color: "#555" }}>Market Placeholder</p>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <h1 style={{ textAlign: "center", color: "#333" }}>Create a Market</h1>
        <form
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <label style={{ marginBottom: "10px", color: "#555" }}>
            Question:
            <input
              type="text"
              name="question"
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          </label>
          <label style={{ marginBottom: "10px", color: "#555" }}>
            Category:
            <input
              type="text"
              name="category"
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          </label>
          <label style={{ marginBottom: "10px", color: "#555" }}>
            Odds:
            <input
              type="text"
              name="odds"
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Create Market
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
