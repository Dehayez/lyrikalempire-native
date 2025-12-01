const dbHelpers = require('../helpers/dbHelpers');

const createPlaylist = (req, res) => {
  const { title, description } = req.body;
  const { user_id } = req.body;

  dbHelpers.handleQuery(
    'INSERT INTO playlists (title, description, user_id) VALUES (?, ?, ?)',
    [title, description, user_id],
    res,
    'Playlist created successfully',
    false
  );
};

const getPlaylists = async (req, res) => {
  const { user_id } = req.query;
  
  try {
    const [playlists] = await dbHelpers.db.query(
      'SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );
    
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'An error occurred while fetching playlists' });
  }
};

const getPlaylistById = (req, res) => {
  const { id } = req.params;
  dbHelpers.handleQuery(
    'SELECT * FROM playlists WHERE id = ?',
    [id],
    res,
    null,
    true
  );
};

const updatePlaylist = (req, res) => {
  const { title, description } = req.body;
  const { id } = req.params;
  dbHelpers.handleQuery(
    'UPDATE playlists SET title = ?, description = ? WHERE id = ?',
    [title, description, id],
    res,
    'Playlist updated successfully'
  );
};

const deletePlaylist = (req, res) => {
  const { id } = req.params;
  const queries = [
    { query: 'DELETE FROM playlists_beats WHERE playlist_id = ?', params: [id] },
    { query: 'DELETE FROM playlists WHERE id = ?', params: [id] }
  ];
  dbHelpers.handleTransaction(queries, res, 'Playlist and all associated beats deleted successfully');
};

const addBeatToPlaylist = (req, res) => {
  const { playlist_id, beat_id } = req.params;
  dbHelpers.handleQuery(
    'INSERT INTO playlists_beats (playlist_id, beat_id) VALUES (?, ?)',
    [playlist_id, beat_id],
    res,
    'Beat added to playlist successfully'
  );
};

const removeBeatFromPlaylist = (req, res) => {
  const { playlist_id, beat_id } = req.params;
  dbHelpers.handleQuery(
    'DELETE FROM playlists_beats WHERE playlist_id = ? AND beat_id = ?',
    [playlist_id, beat_id],
    res,
    'Beat removed from playlist successfully'
  );
};

const updateBeatOrderInPlaylist = (req, res) => {
  const { playlist_id } = req.params;
  const { beatOrders } = req.body;

  const queries = beatOrders.map(({ id, order }) => ({
    query: 'UPDATE playlists_beats SET beat_order = ? WHERE playlist_id = ? AND beat_id = ?',
    params: [order, playlist_id, id]
  }));

  dbHelpers.handleTransaction(queries, res, 'Beat order updated successfully');
};

const removeAllBeatsFromPlaylist = (req, res) => {
  const { id } = req.params;
  dbHelpers.handleQuery(
    'DELETE FROM playlists_beats WHERE playlist_id = ?',
    [id],
    res,
    'All beats removed from playlist successfully'
  );
};

const getBeatsInPlaylist = (req, res) => {
  const { playlist_id } = req.params;
  dbHelpers.handleQuery(
    `SELECT b.*, pb.beat_order 
     FROM beats b 
     JOIN playlists_beats pb ON b.id = pb.beat_id 
     WHERE pb.playlist_id = ? 
     ORDER BY pb.beat_order`,
    [playlist_id],
    res,
    'Beats in playlist fetched successfully',
    true
  );
};

const addBeatsToPlaylist = async (req, res) => {
  const { playlist_id } = req.params;
  const { beatIds } = req.body;


  try {
    // Check for existing beats in the playlist before adding
    const checkQuery = `
      SELECT beat_id 
      FROM playlists_beats 
      WHERE playlist_id = ? AND beat_id IN (${beatIds.map(() => '?').join(',')})
    `;
    
    
    const [existingBeats] = await dbHelpers.db.query(checkQuery, [playlist_id, ...beatIds]);
    
    
    const existingBeatIds = existingBeats.map(row => row.beat_id);
    const duplicateBeatIds = beatIds.filter(id => existingBeatIds.includes(id));
    
    if (duplicateBeatIds.length > 0) {
    }

    // Continue with the original logic - add all tracks (including duplicates)
    const queries = beatIds.map(beat_id => ({
      query: 'INSERT INTO playlists_beats (playlist_id, beat_id) VALUES (?, ?)',
      params: [playlist_id, beat_id]
    }));

    dbHelpers.handleTransaction(queries, res, 'Beats added to playlist successfully');
  } catch (error) {
    console.error('Database error checking for duplicates:', error);
    return res.status(500).json({ error: 'Database error checking for duplicates' });
  }
};

module.exports = {
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addBeatToPlaylist,
  removeBeatFromPlaylist,
  updateBeatOrderInPlaylist,
  removeAllBeatsFromPlaylist,
  getBeatsInPlaylist,
  addBeatsToPlaylist
};