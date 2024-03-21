const Book = require('../models/Book');
const sharp = require('sharp');
const fs = require('fs');


//Fonction pour récupérer tous les livres
exports.getAllBooks = async (req, res, next) => {
    try {
      // Interroger la base de données pour récupérer tous les livres
      const books = await Book.find();
      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};

//Fonction pour récupérer un livre par son identifiant
exports.getBookById = async (req, res) => {
    try {
        // Interroger la base de données pour trouver le livre par son ID
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
  console.log("Entrée dans le controller addbook");
  console.log("Contenu de la requête reçue :", req.body);
  console.log("Nom du fichier :", req.file.filename);

  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier image téléchargé." });
  }

  const imagePath = req.file.path;
  console.log("Chemin d'accès à l'image :", imagePath);

  // Vérifier si le fichier image existe
  if (!fs.existsSync(imagePath)) {
    return res.status(400).json({ message: "Le fichier image n'existe pas." });
  }

  // Convertir les données du livre (envoyées en tant que chaîne JSON) en objet JavaScript
  const bookData = JSON.parse(req.body.book);
  const { userId, title, author, year, genre, ratings, averageRating } = bookData;

  // Traiter l'image avec sharp et enregistrer le chemin dans imageUrl
  sharp(imagePath)
    .resize(400, 300)
    .toFile(`${req.file.destination}/${title}.webp`, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur lors du traitement de l'image." });
      }

      console.log("Image redimensionnée et convertie en format WebP.");

      const imageUrl = `${req.protocol}://${req.get('host')}/images/${title}.webp`;
      console.log("Image enregistrée, imageUrl :", imageUrl);


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

      // Enregistrer le livre dans la base de données
      book.save()
        .then(() => res.status(201).json({ message: 'Livre créé !' }))
        .catch(error => res.status(400).json({ error }));
    });
};



//fonction pour modifier un livre
exports.updateBookById = async (req, res) => {
  try {
    const bookId = req.params.bookId;
    console.log("l'Id = ", bookId);
    const updatedBookData = JSON.parse(req.body.book);
    console.log("le updatedBookData : ", updatedBookData);


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
      imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
      updatedBook.imageUrl = imageUrl;
    }

    // Enregistre le livre mis à jour dans la base de données
    const savedBook = await updatedBook.save();
    res.status(200).json(savedBook);
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

    // Supprimer le fichier image
    const imagePath = `./images/${bookToDelete.title}.webp`; // Remplacez 'chemin/vers/le/dossier/images/' par le chemin réel de votre dossier images
    fs.unlinkSync(imagePath);

    // Supprimer le livre de la base de données
    await bookToDelete.deleteOne();

    res.status(200).json({ message: "Livre supprimé avec succès" });
  } catch (error) {
    console.log("Erreur lors de la suppression du livre :", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getBestRatedBooks = async (req, res, next) => {
  console.log("entrée serveur")
  try {
      // Récupérer tous les livres avec leurs notes
      console.log("entrée dans la fonction getBestRatedBook");
      const booksWithRatings = await Book.find();

      // Calculer la note moyenne de chaque livre
    const booksWithAverageRating = booksWithRatings.map(book => {
      const totalRatings = book.ratings.length;
      if (totalRatings === 0) {
        return { ...book.toObject(), averageRating: 0 };
      }
      const sumRatings = book.ratings.reduce((acc, cur) => acc + cur.grade, 0);
      const averageRating = sumRatings / totalRatings;
      return { ...book.toObject(), averageRating };
    });

    // Trier les livres par note moyenne décroissante
    const bestRatedBooks = booksWithAverageRating.sort((a, b) => b.averageRating - a.averageRating);

    // Envoyer la liste des livres les mieux notés
    res.json(bestRatedBooks);
  } catch (error) {
    // En cas d'erreur, renvoyer une réponse d'erreur 500
    console.error(error);
    res.status(500).json({ message: "Une erreur s'est produite lors de la récupération des livres les mieux notés." });
  }
};

exports.rateBook = async (req, res, next) => {
  try {
    const { bookId } = req.params; // Récupérer l'identifiant du livre à noter
    const { userId, rating } = req.body; // Récupérer l'identifiant de l'utilisateur et la note du livre
    console.log("requete params = ", req.params);
    console.log("requete body = ",req.body);
    console.log("id du livre + userId + note = ", bookId, userId, rating);
    
    // Logique pour enregistrer la note du livre dans la base de données
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }
    // Ajouter la nouvelle note à la liste des notes du livre
    book.ratings.push({ userId, grade: rating });
    // Sauvegarder le livre avec la nouvelle note
    await book.save();

    // Utiliser une agrégation pour calculer la moyenne des notes (grade) du livre
    const aggregateResult = await Book.aggregate([
      { $match: { _id: book._id } }, // Filtre pour le livre spécifique
      { $unwind: "$ratings" }, // Décompose le tableau de notes
      { $group: { _id: "$_id", averageRating: { $avg: "$ratings.grade" } } } // Calcule la moyenne des notes
    ]);

    // Mise à jour de la propriété averageRating du livre avec la moyenne calculée
    const averageRating = aggregateResult.length > 0 ? aggregateResult[0].averageRating : 0;
    book.averageRating = averageRating;
    await book.save();

    console.log("Book Id = ", book);
    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};