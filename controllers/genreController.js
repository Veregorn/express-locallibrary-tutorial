const Genre = require('../models/genre');
const Book = require('../models/book');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');

// Display list of all Genre.
exports.genre_list = asyncHandler(async (req, res) => {
  const genres = await Genre.find().sort({ name: 1 }).exec();

  res.render('genre_list', { 
    title: 'Genre List', 
    genre_list: genres,
    layout: 'layout',
  });
});

// Display detail page for a specific Genre.
exports.genre_detail = asyncHandler(async (req, res, next) => {
  // Get details of the genre and all books in the genre (in parallel)
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);

  if (genre === null) {
    const err = new Error('Genre not found');
    err.status = 404;
    return next(err);
  }

  res.render('genre_detail', { 
    title: `Genre: ${genre.name}`, 
    genre: genre,
    genre_books: booksInGenre,
    layout: 'layout',
   });
});

// Display Genre create form on GET.
exports.genre_create_get = (req, res) => {
  res.render('genre_form', { 
    title: 'Create Genre',
    genre: null,
    errors: null,
    layout: 'layout',
  });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field
  body('name', 'Genre name must contain at least 3 characters')
    .trim()
    .isLength({ min: 3 })
    .escape(),

  // Process request after validation and sanitization
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data
    const genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages
      res.render('genre_form', { 
        title: 'Create Genre', 
        genre: genre, 
        errors: errors.array(),
        layout: 'layout',
      });
      return;
    }

    try {
      // Check if Genre with the same name already exists
      const genreExists = await Genre.findOne({ name: req.body.name })
        .collation({ locale: 'en', strength: 2 }) // 'Stength 2' is used to make the search case-insensitive
        .exec();
      if (genreExists) {
        // Redirect to the genre page if it already exists
        res.redirect(genreExists.url);
      } else {
        await genre.save();
        res.redirect(genre.url);
      }
    } catch (err) {
      next(err);
    }
  }),
];

// Display Genre delete form on GET.
exports.genre_delete_get = asyncHandler(async (req, res, next) => {
  // Get details of the genre and all books in the genre (in parallel)
  const [genre, allBooksByGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);

  if (genre == null) {
    // No results
    res.redirect('/catalog/genres');
  }

  res.render('genre_delete', { 
    title: 'Delete Genre',
    genre: genre,
    genre_books: allBooksByGenre,
    layout: 'layout',
  });
});

// Handle Genre delete on POST.
exports.genre_delete_post = asyncHandler(async (req, res, next) => {
    // Get genre and books by genre (in parallel)
    const [genre, allBooksByGenre] = await Promise.all([
        Genre.findById(req.params.id).exec(),
        Book.find({ genre: req.params.id }, "title summary").exec(),
    ]);

    if (allBooksByGenre.length > 0) {
        // Genre has books. Render in the same way as for GET route
        res.render('genre_delete', {
            title: 'Delete Genre',
            genre: genre,
            genre_books: allBooksByGenre,
            layout: 'layout',
        });
        return;
    } else {
        // Genre has no books. Delete object and redirect to the list of genres
        await Genre.findByIdAndDelete(req.body.genreid);
        res.redirect('/catalog/genres');
    }
});

// Display Genre update form on GET.
exports.genre_update_get = asyncHandler(async (req, res, next) => {
  // Get genre
  const genre = await Genre.findById(req.params.id);

  if (genre == null) {
    // No results
    const err = new Error('Genre not found');
    err.status = 404;
    return next(err);
  }

  res.render('genre_form', {
    title: 'Update Genre',
    genre: genre,
    errors: null,
    layout: 'layout',
  });
});

// Handle Genre update on POST.
exports.genre_update_post = [
  // Validate and sanitize the name field
  body('name', 'Genre name must contain at least 3 characters')
    .trim()
    .isLength({ min: 3 })
    .escape(),

  // Process request after validation and sanitization
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data
    const genre = new Genre({ 
      name: req.body.name,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages
      res.render('genre_form', { 
        title: 'Update Genre', 
        genre: genre, 
        errors: errors.array(),
        layout: 'layout',
      });
      return;
    } else {
      // Data from form is valid. Update the record
      await Genre.findByIdAndUpdate(req.params.id, genre, {});
      res.redirect(genre.url);
    }
  }),
];