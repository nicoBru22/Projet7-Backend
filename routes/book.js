const express = require('express');
const router = express.Router();

const multer = require('../middleware/multer-config');
const bookCtrl= require('../controllers/book');
const verifyTOken = require('../middleware/auth');

router.get('/bestrating', bookCtrl.getBestRatedBooks);
router.get('/', bookCtrl.getAllBooks);
router.get('/:bookId', bookCtrl.getBookById);
router.post('/', multer, verifyTOken, bookCtrl.addBook);
router.put('/:bookId', multer, bookCtrl.updateBookById);
router.delete('/:bookId', verifyTOken, bookCtrl.deleteBookById);
router.post('/:bookId/rating', verifyTOken, bookCtrl.rateBook);

module.exports = router;