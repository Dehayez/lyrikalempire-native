const { handleTransaction, handleQuery } = require('../helpers/dbHelpers');
const db = require('../config/db');
const { uploadToBackblaze } = require('../config/multer');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const B2 = require('backblaze-b2');

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

const tableMap = {
  genres: 'beats_genres',
  moods: 'beats_moods',
  keywords: 'beats_keywords',
  features: 'beats_features',
  lyrics: 'beats_lyrics'
};

const getSignedUrl = async (req, res) => {
  const { fileName } = req.params;
  const { userId } = req.query;

  try {
    await b2.authorize();

    const filePath = `audio/users/${userId}/${fileName}`;

    const response = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID,
      fileNamePrefix: filePath,
      validDurationInSeconds: 3600,
    });

    if (!response.data.authorizationToken) {
      throw new Error('Authorization token is missing in the response');
    }

    const signedUrl = `https://f003.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${filePath}?Authorization=${response.data.authorizationToken}`;

    res.status(200).json({ signedUrl });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while getting the signed URL', details: error.message });
  }
};

const getTableName = (association_type, res) => {
  const tableName = tableMap[association_type];
  if (!tableName) {
    res.status(400).json({ error: 'Invalid association type' });
    return null;
  }
  return tableName;
};

const getBeats = (req, res) => {
  const { associationType, associationIds, user_id } = req.query;
  console.log('[getBeats] Called with params:', { associationType, associationIds, user_id });

  if (associationType && associationIds) {
    const tableName = getTableName(associationType, res);
    if (!tableName) return;

    const ids = associationIds.split(',').map(id => parseInt(id, 10));
    const placeholders = ids.map(() => '?').join(',');

    const query = `
      SELECT b.* FROM beats b
      JOIN ${tableName} bg ON b.id = bg.beat_id
      WHERE bg.${associationType.slice(0, -1)}_id IN (${placeholders}) AND b.user_id = ?
    `;

    handleQuery(query, [...ids, user_id], res, `Beats with ${associationType} fetched successfully`, true);
  } else {
    // Use a simpler approach with separate queries for each association type
    console.log('[getBeats] Fetching beats for user_id:', user_id);
    const beatsQuery = 'SELECT * FROM beats WHERE user_id = ? ORDER BY created_at DESC';
    
    db.query(beatsQuery, [user_id])
      .then(async ([beats]) => {
        console.log('[getBeats] Found beats:', beats.length);
        if (beats.length === 0) {
          console.log('[getBeats] No beats found, returning empty array');
          return res.status(200).json([]);
        }
        
        const beatIds = beats.map(beat => beat.id);
        const placeholders = beatIds.map(() => '?').join(',');
        console.log('[getBeats] Beat IDs to fetch associations for:', beatIds.slice(0, 5), `(showing first 5 of ${beatIds.length})`);
        
        // Fetch all associations in parallel
        const [
          [genreResults],
          [moodResults], 
          [keywordResults],
          [featureResults],
          [lyricsResults]
        ] = await Promise.all([
          db.query(`
            SELECT bg.beat_id, bg.genre_id, g.name 
            FROM beats_genres bg 
            JOIN genres g ON bg.genre_id = g.id 
            WHERE bg.beat_id IN (${placeholders})
          `, beatIds),
          db.query(`
            SELECT bm.beat_id, bm.mood_id, m.name 
            FROM beats_moods bm 
            JOIN moods m ON bm.mood_id = m.id 
            WHERE bm.beat_id IN (${placeholders})
          `, beatIds),
          db.query(`
            SELECT bk.beat_id, bk.keyword_id, k.name 
            FROM beats_keywords bk 
            JOIN keywords k ON bk.keyword_id = k.id 
            WHERE bk.beat_id IN (${placeholders})
          `, beatIds),
          db.query(`
            SELECT bf.beat_id, bf.feature_id, f.name 
            FROM beats_features bf 
            JOIN features f ON bf.feature_id = f.id 
            WHERE bf.beat_id IN (${placeholders})
          `, beatIds),
          db.query(`
            SELECT bl.beat_id, bl.lyrics_id 
            FROM beats_lyrics bl 
            WHERE bl.beat_id IN (${placeholders})
          `, beatIds)
        ]);
        
        console.log('[getBeats] Association query results:', {
          genres: genreResults.length,
          moods: moodResults.length,
          keywords: keywordResults.length,
          features: featureResults.length,
          lyrics: lyricsResults.length
        });
        
        // Group associations by beat_id
        const genresByBeat = {};
        const moodsByBeat = {};
        const keywordsByBeat = {};
        const featuresByBeat = {};
        const lyricsByBeat = {};
        
        genreResults.forEach(row => {
          if (!genresByBeat[row.beat_id]) genresByBeat[row.beat_id] = [];
          genresByBeat[row.beat_id].push({ genre_id: row.genre_id, name: row.name });
        });
        
        moodResults.forEach(row => {
          if (!moodsByBeat[row.beat_id]) moodsByBeat[row.beat_id] = [];
          moodsByBeat[row.beat_id].push({ mood_id: row.mood_id, name: row.name });
        });
        
        keywordResults.forEach(row => {
          if (!keywordsByBeat[row.beat_id]) keywordsByBeat[row.beat_id] = [];
          keywordsByBeat[row.beat_id].push({ keyword_id: row.keyword_id, name: row.name });
        });
        
        featureResults.forEach(row => {
          if (!featuresByBeat[row.beat_id]) featuresByBeat[row.beat_id] = [];
          featuresByBeat[row.beat_id].push({ feature_id: row.feature_id, name: row.name });
        });
        
        lyricsResults.forEach(row => {
          if (!lyricsByBeat[row.beat_id]) lyricsByBeat[row.beat_id] = [];
          lyricsByBeat[row.beat_id].push({ lyrics_id: row.lyrics_id });
        });
        
        console.log('[getBeats] Grouped associations sample:', {
          genresByBeat: Object.keys(genresByBeat).length > 0 ? genresByBeat[Object.keys(genresByBeat)[0]] : 'none',
          moodsByBeat: Object.keys(moodsByBeat).length > 0 ? moodsByBeat[Object.keys(moodsByBeat)[0]] : 'none'
        });
        
        // Combine beats with their associations
        const beatsWithAssociations = beats.map(beat => ({
          ...beat,
          genres: genresByBeat[beat.id] || [],
          moods: moodsByBeat[beat.id] || [],
          keywords: keywordsByBeat[beat.id] || [],
          features: featuresByBeat[beat.id] || [],
          lyrics: lyricsByBeat[beat.id] || []
        }));
        
        console.log('[getBeats] Sample beat with associations:', beatsWithAssociations[0]);
        console.log('[getBeats] Total beats with associations:', beatsWithAssociations.length);
        
        res.status(200).json(beatsWithAssociations);
      })
      .catch(error => {
        console.error('Database error:', error);
        res.status(500).json({ error: 'An error occurred while fetching beats' });
      });
      
    
  }
};

const createBeat = async (req, res) => {
  const { title, bpm, tierlist, duration, user_id } = req.body;
  const createdAt = new Date();

  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    // Use the sanitized filename from multer (which already has timestamp and sanitized name)
    const multerFileBase = path.parse(req.file.filename).name;
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../uploads', `${multerFileBase}.aac`);
    
    console.log('🎵 [SERVER] Creating beat with sanitized filename:', {
      original: req.file.originalname,
      multerFilename: req.file.filename,
      multerFileBase: multerFileBase
    });
    await convertToAAC(inputPath, outputPath);

    // Create proper file object for uploadToBackblaze with sanitized filename
    const fileForUpload = {
      path: outputPath,
      filename: `${multerFileBase}.aac`,
      originalname: `${multerFileBase}.aac`
    };

    // Upload the converted file to Backblaze
    const audioFileName = await uploadToBackblaze(fileForUpload, user_id);

    // Delete the temporary file
    fs.unlinkSync(outputPath);

    const query = 'INSERT INTO beats (title, audio, bpm, tierlist, created_at, duration, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const params = [title, audioFileName, bpm, tierlist, createdAt, duration, user_id];

    handleQuery(query, params, res, 'Beat added successfully');
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while creating the beat' });
  }
};

const convertToAAC = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
      ffmpeg()
      .input(inputPath)
        .audioCodec('aac')
        .audioBitrate('192k')
        .toFormat('adts')
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        })
        .save(outputPath);
  });
};

const getBeatById = (req, res) => {
  const { id } = req.params;
  handleQuery('SELECT * FROM beats WHERE id = ?', [id], res, 'Beat fetched successfully', true);
};

const updateBeat = (req, res) => {
  const { id } = req.params;
  const fields = ['title', 'bpm', 'tierlist', 'filePath'];
  const updates = [];
  const params = [];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  const query = `UPDATE beats SET ${updates.join(', ')} WHERE id = ?`;

  handleQuery(query, params, res, 'Beat updated successfully');
};

const deleteBeat = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  try {
    const [results] = await db.query('SELECT audio FROM beats WHERE id = ?', [id]);
    const fileName = results[0]?.audio;

    if (fileName) {
        // Construct the file path
        const filePath = `audio/users/${userId}/${fileName}`;

        // Delete file from Backblaze B2
        await b2.authorize();

        // Retrieve the fileId from Backblaze B2
        const fileListResponse = await b2.listFileNames({
          bucketId: process.env.B2_BUCKET_ID,
          prefix: filePath,
          maxFileCount: 1,
        });

      if (fileListResponse.data.files.length > 0) {
          const fileId = fileListResponse.data.files[0].fileId;

          await b2.deleteFileVersion({
            fileName: filePath,
            fileId: fileId,
          });
      }
    }

    const queries = [
      { query: 'DELETE FROM playlists_beats WHERE beat_id = ?', params: [id] },
      { query: 'DELETE FROM beats_genres WHERE beat_id = ?', params: [id] },
      { query: 'DELETE FROM beats_moods WHERE beat_id = ?', params: [id] },
      { query: 'DELETE FROM beats_keywords WHERE beat_id = ?', params: [id] },
      { query: 'DELETE FROM beats_features WHERE beat_id = ?', params: [id] },
      { query: 'DELETE FROM beats WHERE id = ?', params: [id] }
    ];

    handleTransaction(queries, res, 'Beat and all associated data deleted successfully');
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while deleting the beat' });
  }
};

const replaceAudio = async (req, res) => {
  const { id } = req.params;
  const newAudioFile = req.file;
  const { userId, duration } = req.body;

  if (!newAudioFile) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const [results] = await db.query('SELECT audio FROM beats WHERE id = ?', [id]);
    const oldFilePath = results[0]?.audio;

    if (oldFilePath) {
      // Delete old file from Backblaze B2
      await b2.authorize();
      const fileName = oldFilePath.split('/').pop();

      const fileListResponse = await b2.listFileNames({
        bucketId: process.env.B2_BUCKET_ID,
        prefix: `audio/users/${userId}/${fileName}`,
        maxFileCount: 1,
      });

      if (fileListResponse.data.files.length === 0) {
        // File not found in Backblaze, continuing with upload
      } else {
        const fileId = fileListResponse.data.files[0].fileId;

        await b2.deleteFileVersion({
          fileName: `audio/users/${userId}/${fileName}`,
          fileId: fileId,
        });
      }
    }

    const inputPath = newAudioFile ? newAudioFile.path : undefined;

    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(400).json({ error: 'Uploaded file not found on server.' });
    }

    // Use multer's sanitized filename (preserves timestamp and sanitization)
    const multerFileBase = path.parse(newAudioFile.filename).name;
    const outputPath = path.join(__dirname, '../uploads', `${multerFileBase}.aac`);

    console.log('🔄 [SERVER] Replace audio with sanitized filename:', {
      original: newAudioFile.originalname,
      multerFilename: newAudioFile.filename,
      multerFileBase: multerFileBase
    });

    // Convert the audio file to AAC format
    await convertToAAC(inputPath, outputPath);

    // Create proper file object for uploadToBackblaze
    const fileForUpload = {
      path: outputPath,
      filename: `${multerFileBase}.aac`,
      originalname: `${multerFileBase}.aac`
    };

    // Upload the converted file to Backblaze
    const newFileUrl = await uploadToBackblaze(fileForUpload, userId);

    // Delete the temporary files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    // Convert duration to number (FormData values are strings)
    const durationNumber = parseFloat(duration);

    const query = 'UPDATE beats SET audio = ?, duration = ? WHERE id = ?';
    const params = [newFileUrl, durationNumber, id];

    await db.query(query, params);
    
    // Verify the update
    const [verifyResults] = await db.query('SELECT audio, duration FROM beats WHERE id = ?', [id]);
    
    res.status(200).json({ message: 'Audio replaced successfully', fileUrl: newFileUrl });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while replacing the audio' });
  }
};

const addAssociation = (req, res) => {
  const { beat_id, association_type } = req.params;
  const { association_id } = req.body;

  if (!association_id) {
    return res.status(400).json({ error: 'Association ID is required' });
  }

  const tableName = getTableName(association_type, res);
  if (!tableName) return;

  const columnName = association_type === 'lyrics' ? 'lyrics_id' : `${association_type.slice(0, -1)}_id`;
  const query = `INSERT INTO ${tableName} (beat_id, ${columnName}) VALUES (?, ?)`;
  const params = [beat_id, association_id];

  handleQuery(query, params, res, 'Association added successfully');
};

const removeAssociation = (req, res) => {
  const { beat_id, association_type, association_id } = req.params;

  const tableName = getTableName(association_type, res);
  if (!tableName) return;

  const query = `DELETE FROM ${tableName} WHERE beat_id = ? AND ${association_type.slice(0, -1)}_id = ?`;
  const params = [beat_id, association_id];

  handleQuery(query, params, res, 'Association removed successfully');
};

const getAssociations = (req, res) => {
  const { beat_id, association_type } = req.params;

  const tableName = getTableName(association_type, res);
  if (!tableName) return;

  const query = `SELECT * FROM ${tableName} WHERE beat_id = ?`;
  const params = [beat_id];

  handleQuery(query, params, res, 'Associations fetched successfully', true);
};

const removeAllAssociations = (req, res) => {
  const { beat_id, association_type } = req.params;

  const tableName = getTableName(association_type, res);
  if (!tableName) return;

  const query = `DELETE FROM ${tableName} WHERE beat_id = ?`;
  const params = [beat_id];

  handleQuery(query, params, res, 'All associations removed successfully');
};

module.exports = {
  getBeats,
  createBeat,
  getBeatById,
  updateBeat,
  deleteBeat,
  addAssociation,
  removeAssociation,
  getAssociations,
  removeAllAssociations,
  replaceAudio,
  getSignedUrl
};