const author = require('../models/author');
const Author = require('../models/author');
const Book = require('../models/book');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');

// Display list of all Authors.
exports.author_list = asyncHandler(async (req, res, next) => {
  const authors = await Author.find().sort({ family_name: 1 }).exec();

  res.render('author_list', {
    title: 'Author List',
    author_list: authors,
    layout: 'layout',
  });
});

// Display detail page for a specific Author.
exports.author_detail = asyncHandler(async (req, res, next) => {
  // Get details of author and all books by author (in parallel)
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, 'title summary').exec(),
  ]);

  if (author == null) {
    const err = new Error('Author not found');
    err.status = 404;
    return next(err);
  }

  res.render('author_detail', { 
    author: author,
    author_books: allBooksByAuthor,
    layout: 'layout',
  });
});

// Display Author create form on GET.
exports.author_create_get = (req, res) => {
  res.render('author_form', { 
    title: 'Create Author',
    author: null,
    errors: null,
    layout: 'layout',
  });
};

// Handle Author create on POST.
exports.author_create_post = [
  // Validate and sanitize fields
  body('first_name')
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage('First name must be specified.')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'), // Specify the error message to display if the previous validation method fails
  body('family_name')
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage('Family name must be specified.')
    .isAlphanumeric()
    .withMessage('Family name has non-alphanumeric characters.'),
  body('date_of_birth', 'Invalid date of birth')
    .optional({ values: "falsy" }) // The optional() method allows the field to be empty. We'll accept either an empty string or null as an empty value
    .isISO8601()
    .toDate(),
  body('date_of_death', 'Invalid date of death')
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create an Author object with escaped and trimmed data
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages
      res.render('author_form', { 
        title: 'Create Author',
        author: author,
        errors: errors.array(),
        layout: 'layout',
      });
      return;
    };
    
    // Data from form is valid
    try {
      await author.save();
      res.redirect(author.url);
    }
    catch (err) {
      next(err);
    }
  }),
]

// Display Author delete form on GET.
exports.author_delete_get = asyncHandler(async (req, res, next) => {
  // Get details of author and all books by author (in parallel)
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, 'title summary').exec(),
  ]);
  
  if (author === null) {
    // No results
    res.redirect('/catalog/authors');
  }

  res.render('author_delete', { 
    title: 'Delete Author', 
    author: author,
    author_books: allBooksByAuthor,
    layout: 'layout',
  });
});

// Handle Author delete on POST.
exports.author_delete_post = asyncHandler(async (req, res, next) => {
    // Get author and books by author
    const [author, allBooksByAuthor] = await Promise.all([
        Author.findById(req.body.authorid).exec(),
        Book.find({ author: req.params.id }, 'title summary').exec(),
    ]);

    if (allBooksByAuthor.length > 0) {
        // Author has books. Render in same way as for GET route
        res.render('author_delete', {
            title: 'Delete Author',
            author: author,
            author_books: allBooksByAuthor,
            layout: 'layout',
        });
        return;
    } else {
        // Author has no books. Delete object and redirect to the list of authors.
        await Author.findByIdAndDelete(req.body.authorid);
        res.redirect('/catalog/authors');
    }
});

// Display Author update form on GET.
exports.author_update_get = asyncHandler(async (req, res, next) => {
  // Get author
  const author = await Author.findById(req.params.id);

  if (author == null) {
    // No results
    const err = new Error('Author not found');
    err.status = 404;
    return next(err);
  }
  
  res.render('author_form', { 
    title: 'Update Author',
    author: author,
    errors: null,
    layout: 'layout',
  });
});

// Handle Author update on POST.
exports.author_update_post = [
  // Validate and sanitize fields
  body('first_name')
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage('First name must be specified.')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'),
  body('family_name')
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage('Family name must be specified.')
    .isAlphanumeric()
    .withMessage('Family name has non-alphanumeric characters.'),
  body('date_of_birth', 'Invalid date of birth')
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body('date_of_death', 'Invalid date of death')
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
    
  // Process request after validation and sanitization
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create an Author object with escaped and trimmed data
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages
      res.render('author_form', { 
        title: 'Update Author',
        author: author,
        errors: errors.array(),
        layout: 'layout',
      });
      return;
    }
    else {
      // Data from form is valid. Update the record.
      const updatedAuthor = await Author.findByIdAndUpdate(req.params.id, author, {});
      res.redirect(updatedAuthor.url);
    }
  })
];