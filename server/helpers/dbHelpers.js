const db = require('../config/db');

const handleQuery = async (query, params, res, successMessage, returnResultsOnly = false) => {
  if (!res) {
    console.error('Response object is undefined in handleQuery');
    throw new Error('Response object is undefined');
  }

  try {
    const [results] = await db.query(query, params);
    if (returnResultsOnly) {
      return res.json(results);
    }
    res.json({ message: successMessage, results });
  } catch (err) {
    console.error('Error in handleQuery:', err);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
};

const handleTransaction = async (queries, res, successMessage) => {
  if (!res) {
    console.error('Response object is undefined in handleTransaction');
    throw new Error('Response object is undefined');
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const { query, params } of queries) {
      await connection.query(query, params);
    }
    await connection.commit();
    res.json({ message: successMessage });
  } catch (err) {
    await connection.rollback();
    console.error('Error in handleTransaction:', err);
    res.status(500).json({ error: 'An error occurred while processing the transaction' });
  } finally {
    connection.release();
  }
};

module.exports = { handleQuery, handleTransaction, db };