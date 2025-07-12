const { handleQuery, handleTransaction } = require('../helpers/dbHelpers');

const getGenres = (req, res) => {
  handleQuery('SELECT * FROM genres', [], res, 'Genres fetched successfully', true);
};

const createGenre = (req, res) => {
  const { name } = req.body;
  handleQuery('INSERT INTO genres (name) VALUES (?)', [name], res, 'Genre created successfully');
};

const updateGenre = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  handleQuery('UPDATE genres SET name = ? WHERE id = ?', [name, id], res, 'Genre updated successfully');
};

const deleteGenre = (req, res) => {
  const { id } = req.params;
  const queries = [
    { query: 'DELETE FROM beats_genres WHERE genre_id = ?', params: [id] },
    { query: 'DELETE FROM genres WHERE id = ?', params: [id] }
  ];
  handleTransaction(queries, res, 'Genre and all associations deleted successfully');
};

module.exports = {
  getGenres,
  createGenre,
  updateGenre,
  deleteGenre,
};