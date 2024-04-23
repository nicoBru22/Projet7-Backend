const mongoose = require('mongoose');

const bookSchema = mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: Number, required: true, min: 0, max: 2030 },
  genre: { type: String, required: true },
  imageUrl: { type: String, required: true },
  ratings: [{ 
    userId: { type: String, required: true },
    grade: { type: Number, required: true }
  }],
  averageRating: { type: Number, default: 0 }
});

bookSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
  } else {
    const totalRating = this.ratings.reduce((acc, rating) => acc + rating.grade, 0);
    this.averageRating = totalRating / this.ratings.length;
  }
};

module.exports = mongoose.model('Book', bookSchema);