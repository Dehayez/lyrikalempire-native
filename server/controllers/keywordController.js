const { handleQuery, handleTransaction } = require('../helpers/dbHelpers');

const getKeywords = (req, res) => {
  handleQuery('SELECT * FROM keywords', [], res, 'Keywords fetched successfully', true);
};

const createKeyword = (req, res) => {
  const { name } = req.body;
  handleQuery('INSERT INTO keywords (name) VALUES (?)', [name], res, 'Keyword created successfully');
};

const updateKeyword = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  handleQuery('UPDATE keywords SET name = ? WHERE id = ?', [name, id], res, 'Keyword updated successfully');
};

const deleteKeyword = (req, res) => {
  const { id } = req.params;
  const queries = [
    { query: 'DELETE FROM beats_keywords WHERE keyword_id = ?', params: [id] },
    { query: 'DELETE FROM keywords WHERE id = ?', params: [id] }
  ];
  handleTransaction(queries, res, 'Keyword and all associations deleted successfully');
};

module.exports = {
  getKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
};