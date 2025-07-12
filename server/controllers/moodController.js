const { handleQuery, handleTransaction } = require('../helpers/dbHelpers');

const getMoods = (req, res) => {
  handleQuery('SELECT * FROM moods', [], res, 'Moods fetched successfully', true);
};

const createMood = (req, res) => {
  const { name } = req.body;
  handleQuery('INSERT INTO moods (name) VALUES (?)', [name], res, 'Mood created successfully');
};

const updateMood = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  handleQuery('UPDATE moods SET name = ? WHERE id = ?', [name, id], res, 'Mood updated successfully');
};

const deleteMood = (req, res) => {
  const { id } = req.params;
  const queries = [
    { query: 'DELETE FROM beats_moods WHERE mood_id = ?', params: [id] },
    { query: 'DELETE FROM moods WHERE id = ?', params: [id] }
  ];
  handleTransaction(queries, res, 'Mood and all associations deleted successfully');
};

module.exports = {
  getMoods,
  createMood,
  updateMood,
  deleteMood,
};