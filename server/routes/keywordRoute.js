const express = require('express');
const router = express.Router();
const keywordController = require('../controllers/keywordController');

router.get('/', keywordController.getKeywords);
router.post('/', keywordController.createKeyword);
router.put('/:id', keywordController.updateKeyword);
router.delete('/:id', keywordController.deleteKeyword);

module.exports = router;