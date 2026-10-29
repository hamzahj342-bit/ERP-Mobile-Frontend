import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../TransactionHistory.css';
import { FaArrowLeft, FaFilter } from 'react-icons/fa';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'buy' | 'sell'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New states for advanced filter
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entity, setEntity] = useState('');
  const [product, setProduct] = useState('');

  const navigate = useNavigate();

  // Fetch transactions
  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/transactions?page=${page}&limit=10`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data.data)) {
          setTransactions([]);
          setFiltered([]);
          setTotalPages(1);
        } else {
          setTransactions(data.data);
          setFiltered(data.data);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      })
      .catch(err => {
        setError('Error fetching transactions. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, [page]);

  // Apply filterType (all/buy/sell)
  useEffect(() => {
    let data = [...transactions];

    if (filterType !== 'all') {
      data = data.filter(t => t.transaction_type === filterType);
    }

    data = data.filter(t => t.status === "active");

    // Apply advanced filters
    if (startDate) {
      data = data.filter(t => new Date(t.date) >= new Date(startDate));
    }
    if (endDate) {
      data = data.filter(t => new Date(t.date) <= new Date(endDate));
    }
    if (entity) {
      data = data.filter(t => 
        t.Entity?.name?.toLowerCase().includes(entity.toLowerCase())
      );
    }
    if (product) {
      data = data.filter(t => 
        t.Product?.name?.toLowerCase().includes(product.toLowerCase())
      );
    }

    setFiltered(data);
  }, [filterType, transactions, startDate, endDate, entity, product]);

  return (
    <>
    <NavigationBar />
    <div className="transaction-history-container">

      <button className='back-btn' style={{marginTop:"45px"}}
        onClick={() => navigate('/dashboard')}
      >
        <FaArrowLeft />
      </button>

      <div className="header-row">
        <h2>Transaction History</h2>
        
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="filter-panel">
          <label>
            Start Date:
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </label>
          <label>
            End Date:
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </label>
          <label>
            Entity Name:
            <input type="text" value={entity} onChange={e => setEntity(e.target.value)} placeholder="Enter entity name" />
          </label>
          <label>
            Product Name:
            <input type="text" value={product} onChange={e => setProduct(e.target.value)} placeholder="Enter product name" />
          </label>
          <div className="filter-actions">
            <button onClick={() => { setStartDate(''); setEndDate(''); setEntity(''); setProduct(''); }}>
              Clear
            </button>
            <button onClick={() => setShowFilters(false)}>Apply</button>
          </div>
        </div>
      )}

      <div className="filter-buttons">
        <button
          className={filterType === 'all' ? 'active' : ''}
          onClick={() => setFilterType('all')}
        >
          All
        </button>
        <button
          className={filterType === 'buy' ? 'active' : ''}
          onClick={() => setFilterType('buy')}
        >
          Purchase
        </button>
        <button
          className={filterType === 'sell' ? 'active' : ''}
          onClick={() => setFilterType('sell')}
        >
          Sale
        </button>
         {/* Filter Button Top Right */}
        <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          <FaFilter /> Filters
        </button>
      </div>

      {loading && <p>Loading transactions...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <table className="transaction-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Product</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Entity</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(filtered) && filtered.length > 0 ? (
            filtered.map(txn => (
              <tr key={txn.id}>
                <td>{new Date(txn.date).toLocaleDateString()}</td>
                <td>{txn.Product?.name || 'N/A'}</td>
                <td className={txn.transaction_type === 'buy' ? 'buy' : 'sell'}>
                  {txn.transaction_type.toUpperCase()}
                </td>
                <td>{txn.quantity}</td>
                <td>{txn.price}</td>
                <td>{txn.Entity?.name || txn.entity_id}</td>
              </tr>
            ))
          ) : (
            !loading && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  No transactions found.
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="pagination">
        <button
          className="page-item page-link"
          onClick={() => setPage((p) => p - 1)}
          disabled={page === 1}
        >
          ◀ Previous
        </button>

        {[...Array(totalPages)].map((_, i) => {
          const pageNum = i + 1;
          return (
            <button
              key={pageNum}
              className={`page-link ${pageNum === page ? 'active' : ''}`}
              onClick={() => setPage(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          className="page-link"
          onClick={() => setPage((p) => p + 1)}
          disabled={page === totalPages}
        >
          Next ▶
        </button>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default TransactionHistory;
