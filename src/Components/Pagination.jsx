import React, { useState, useEffect } from "react";
import "../Pagination.css";

const getPageItems = (page, totalPages) => {
  const items = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      items.push(i);
    }
    return items;
  }

  const leftSibling = Math.max(page - 2, 2);
  const rightSibling = Math.min(page + 2, totalPages - 1);

  items.push(1);

  if (leftSibling > 2) {
    items.push("start-ellipsis");
  }

  for (let i = leftSibling; i <= rightSibling; i++) {
    items.push(i);
  }

  if (rightSibling < totalPages - 1) {
    items.push("end-ellipsis");
  }

  items.push(totalPages);
  return items;
};

const Pagination = ({ page, totalPages, onPageChange }) => {
  const [gotoPage, setGotoPage] = useState(page.toString());

  useEffect(() => {
    setGotoPage(page.toString());
  }, [page]);

  const handleGotoSubmit = (event) => {
    event.preventDefault();
    const parsed = Number(gotoPage);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > totalPages) {
      return;
    }
    onPageChange(parsed);
  };

  const pages = getPageItems(page, totalPages);

  return (
    <div className="pagination-container">
      <button
        className="page-btn circle"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹
      </button>

      {pages.map((item, index) => {
        if (item === "start-ellipsis" || item === "end-ellipsis") {
          return (
            <span key={`${item}-${index}`} className="page-ellipsis">
              …
            </span>
          );
        }

        return (
          <button
            key={item}
            className={`page-btn circle ${page === item ? "active" : ""}`}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        );
      })}

      <button
        className="page-btn circle"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ›
      </button>

      <form className="pagination-goto" onSubmit={handleGotoSubmit}>
        <label htmlFor="goto-page-input">Go to</label>
        <input
          id="goto-page-input"
          type="number"
          min="1"
          max={totalPages}
          value={gotoPage}
          onChange={(e) => setGotoPage(e.target.value)}
          
        />
        <button type="submit" className="page-btn go-btn">
          Go
        </button>
      </form>
    </div>
  );
};

export default Pagination;
