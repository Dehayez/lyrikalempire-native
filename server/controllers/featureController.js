const { handleQuery, handleTransaction } = require('../helpers/dbHelpers');

const getFeatures = (req, res) => {
  handleQuery('SELECT * FROM features', [], res, 'Features fetched successfully', true);
};

const createFeature = (req, res) => {
  const { name } = req.body;
  handleQuery('INSERT INTO features (name) VALUES (?)', [name], res, 'Feature created successfully');
};

const updateFeature = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  handleQuery('UPDATE features SET name = ? WHERE id = ?', [name, id], res, 'Feature updated successfully');
};

const deleteFeature = (req, res) => {
  const { id } = req.params;
  const queries = [
    { query: 'DELETE FROM beats_features WHERE feature_id = ?', params: [id] },
    { query: 'DELETE FROM features WHERE id = ?', params: [id] }
  ];
  handleTransaction(queries, res, 'Feature and all associations deleted successfully');
};

module.exports = {
  getFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
};