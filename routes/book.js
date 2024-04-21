const express = require('express');
const router = express.Router();

const multer = require('../middleware/multer-config');
const bookCtrl= require('../controllers/book');

router.get('/bestrating', bookCtrl.getBestRatedBooks);
router.get('/', bookCtrl.getAllBooks);
router.get('/:bookId', bookCtrl.getBookById);
router.post('/', multer, bookCtrl.addBook);
router.put('/:bookId', multer, bookCtrl.updateBookById);
router.delete('/:bookId', bookCtrl.deleteBookById);
router.post('/:bookId/rating', bookCtrl.rateBook);

module.exports = router;