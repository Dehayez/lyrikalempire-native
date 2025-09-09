const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const checkPlan = require('../middleware/checkPlan');


router.post('/', checkPlan('paid'), playlistController.createPlaylist);
router.get('/', playlistController.getPlaylists);
router.get('/:id', playlistController.getPlaylistById);
router.put('/:id', checkPlan('paid'), playlistController.updatePlaylist);
router.delete('/:id', checkPlan('paid'), playlistController.deletePlaylist);
router.post('/:playlist_id/beats/:beat_id', checkPlan('paid'), playlistController.addBeatToPlaylist);
router.delete('/:playlist_id/beats/:beat_id', checkPlan('paid'), playlistController.removeBeatFromPlaylist);
router.get('/:playlist_id/beats', playlistController.getBeatsInPlaylist);
router.post('/:playlist_id/beats', checkPlan('paid'), playlistController.addBeatsToPlaylist);
router.put('/:playlist_id/beats/order', checkPlan('paid'), playlistController.updateBeatOrderInPlaylist);
router.delete('/:id/beats', checkPlan('paid'), playlistController.removeAllBeatsFromPlaylist);

module.exports = router;