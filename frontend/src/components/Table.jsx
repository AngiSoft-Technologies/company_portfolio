import React from 'react';

const Table = ({ columns, data, loading, error, actions }) => {
  if (loading) return <div className="admin-table-loading">Loading...</div>;
  if (error) return <div className="admin-table-error">{error}</div>;
  if (!data || data.length === 0) return <div className="admin-table-empty">No data found.</div>;

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="admin-table-th">{col.title}</th>
            ))}
            {actions && <th className="admin-table-th">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row._id || idx} className="admin-table-tr">
              {columns.map((col) => (
                <td key={col.key} className="admin-table-td">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td className="admin-table-td admin-table-actions">
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table; 