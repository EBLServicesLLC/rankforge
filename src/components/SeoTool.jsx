import { useState } from "react";

export default function SeoTool({ setResults }) {
  const [keyword, setKeyword] = useState("");

  function runSEO() {
    const mockResults = [
      { keyword: keyword || "local seo", rank: 5 },
      { keyword: "seo services", rank: 12 },
      { keyword: "ai marketing", rank: 8 }
    ];

    if (setResults) {
      setResults(mockResults);
    }
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <h2>SEO Tool</h2>

      <input
        type="text"
        placeholder="Enter keyword..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{ padding: "8px", marginRight: "10px" }}
      />

      <button onClick={runSEO}>
        Run Analysis
      </button>
    </div>
  );
}