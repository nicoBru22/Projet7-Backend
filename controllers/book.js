const Book = require('../models/Book');
const sharp = require('sharp');
const fs = require('fs');


//Fonction pour récupérer tous les livres
exports.getAllBooks = async (req, res, next) => {
    try {
      const books = await Book.find();
      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};

//Fonction pour récupérer un livre par son identifiant
exports.getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.bookId);
        if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé' });
        }
        res.status(200).json(book);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fonction pour ajouter un livre
exports.addBook = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier image téléchargé." });
  }

  const imagePath = req.file.path;

  const bookData = JSON.parse(req.body.book);
  const { userId, title, author, year, genre, ratings, averageRating } = bookData;

  sharp(imagePath)
    .resize(400, 300)
    .toFile(`${req.file.destination}/${title}.webp`, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur lors du traitement de l'image." });
      }

  const imageUrl = `${req.protocol}://${req.get('host')}/images/${title}.webp`;

  const book = new Book({
    userId,
    title,
    author,
    year,
    genre,
    ratings,
    averageRating,
    imageUrl
  });

  book.save()
    .then(() => res.status(201).json({ message: 'Livre créé !' }))
    .catch(error => res.status(400).json({ error }));
  });
};



//fonction pour modifier un livre
exports.updateBookById = async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const updatedBookData = JSON.parse(req.body.book);

    // Vérifie si le livre existe
    const updatedBook = await Book.findById(bookId);
    if (!updatedBook) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }

    // Met à jour les propriétés du livre
    updatedBook.title = updatedBookData.title;
    updatedBook.author = updatedBookData.author;
    updatedBook.year = updatedBookData.year;
    updatedBook.genre = updatedBookData.genre;

    let imageUrl;

    if (req.file) {
      await sharp(req.file.path)
        .resize(400, 300)
        .toFile(`${req.file.destination}/${updatedBookData.title}.webp`);
      imageUrl = `${req.protocol}://${req.get('host')}/images/${updatedBookData.title}.webp`;
    }
    updatedBook.imageUrl = imageUrl;


    updatedBook.save()
    .then(() => res.status(201).json({ message: 'Livre modifié !' }))
    .catch(error => res.status(400).json({ error }));

  } catch (error) {
    console.log("error ?", error.message)
    res.status(500).json({ message: error.message });
  }
};

// Fonction pour supprimer un livre par son ID
exports.deleteBookById = async (req, res, next) => {
  try {
    const bookId = req.params.bookId;
    const bookToDelete = await Book.findById(bookId);

    if (!bookToDelete) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }

    const imagePath = `./images/${bookToDelete.title}.webp`;
    fs.unlinkSync(imagePath);

    await bookToDelete.deleteOne();

    res.status(200).json({ message: "Livre supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBestRatedBooks = async (req, res, next) => {
  try {
    const booksWithRatings = await Book.find();

    const booksWithAverageRating = booksWithRatings.map(book => {
      const totalRatings = book.ratings.length;
      if (totalRatings === 0) {
        return { ...book.toObject(), averageRating: 0 };
      }
      const sumRatings = book.ratings.reduce((acc, cur) => acc + cur.grade, 0);
      const averageRating = sumRatings / totalRatings;
      return { ...book.toObject(), averageRating };
    });

    const bestRatedBooks = booksWithAverageRating.sort((a, b) => b.averageRating - a.averageRating);
    const topThreeBooks = bestRatedBooks.slice(0, 3);

    res.json(topThreeBooks);
  } catch (error) {

    console.error(error);
    res.status(500).json({ message: "Une erreur s'est produite lors de la récupération des livres les mieux notés." });
  }
};

exports.rateBook = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const { userId, rating } = req.body;

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }

    book.ratings.push({ userId, grade: rating });

    await book.save();

    const aggregateResult = await Book.aggregate([
      { $match: { _id: book._id } },
      { $unwind: "$ratings" },
      { $group: { _id: "$_id", averageRating: { $avg: "$ratings.grade" } } }
    ]);

    const averageRating = aggregateResult.length > 0 ? aggregateResult[0].averageRating : 0;
    book.averageRating = averageRating;
    await book.save();

    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};