export default function ResultsTable({ results = [] }) {
  return (
    <div>
      <h2>Results</h2>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Keyword</th>
            <th>Rank</th>
          </tr>
        </thead>

        <tbody>
          {results.length === 0 ? (
            <tr>
              <td colSpan="2">No results yet</td>
            </tr>
          ) : (
            results.map((item, index) => (
              <tr key={index}>
                <td>{item.keyword}</td>
                <td>{item.rank}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}