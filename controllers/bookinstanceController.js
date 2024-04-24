const BookInstance = require('../models/bookInstance');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const Book = require('../models/book');

// Display list of all BookInstances.
exports.bookinstance_list = asyncHandler(async (req, res) => {
  const bookinstances = await BookInstance.find().populate('book').exec();

  res.render('bookinstance_list', {
    title: 'Book Instance List',
    bookinstance_list: bookinstances,
    layout: 'layout',
  });
});

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
  const bookinstance = await BookInstance.findById(req.params.id)
    .populate('book')
    .exec();

  if (bookinstance === null) {
    const err = new Error('Book copy not found');
    err.status = 404;
    return next(err);
  }

  res.render('bookinstance_detail', { 
    bookinstance: bookinstance,
    layout: 'layout',
  });
});

// Display BookInstance create form on GET.
exports.bookinstance_create_get = asyncHandler(async (req, res) => {
  const books = await Book.find({}, 'title').sort({ title: 1 }).exec();

  res.render('bookinstance_form', { 
    title: 'Create BookInstance',
    book_list: books,
    selected_book: null,
    bookinstance: null,
    errors: null,
    layout: 'layout',
  });
});

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitize fields
  body('book', 'Book must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('imprint', 'Imprint must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('status').escape(),
  body('due_back', 'Invalid date')
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages
      const books = await Book.find({}, 'title').sort({ title: 1 }).exec();

      res.render('bookinstance_form', { 
        title: 'Create BookInstance',
        book_list: books,
        selected_book: bookinstance.book._id,
        bookinstance: bookinstance,
        errors: errors.array(),
        layout: 'layout',
      });
      return;
    }

    try {
      await bookinstance.save();
      res.redirect(bookinstance.url);
    } catch (err) {
      next(err);
    }
  }),
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = asyncHandler(async (req, res, next) => {
  const bookinstance = await BookInstance.findById(req.params.id).populate('book').exec();
  
  if (bookinstance == null) {
    // No results
    res.redirect('/catalog/bookinstances');
  }
  
  res.render('bookinstance_delete', { 
    title: 'Delete BookInstance', 
    bookinstance: bookinstance,
    layout: 'layout',
  });
});

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
    const bookinstance = await BookInstance.findById(req.body.bookinstanceid);

    if (bookinstance) {
      await BookInstance.findByIdAndDelete(req.body.bookinstanceid);
    }

    res.redirect('/catalog/bookinstances');
});

// Display BookInstance update form on GET.
exports.bookinstance_update_get = asyncHandler(async (req, res, next) => {
  // Get bookinstance and books
  const [bookinstance, books] = await Promise.all([
    BookInstance.findById(req.params.id).populate('book').exec(),
    Book.find({}, 'title').sort({ title: 1}).exec(),
  ]);

  if (bookinstance == null) {
    // No results
    const err = new Error('Book copy not found');
    err.status = 404;
    return next(err);
  }

  res.render('bookinstance_form', {
    title: 'Update BookInstance',
    bookinstance: bookinstance,
    book_list: books,
    selected_book: bookinstance.book._id,
    errors: null,
    layout: 'layout',
  });
});

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate and sanitize fields
  body('book', 'Book must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('imprint', 'Imprint must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('status').escape(),
  body('due_back', 'Invalid date')
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages
      const books = await Book.find({}, 'title').sort({ title: 1 }).exec();

      res.render('bookinstance_form', { 
        title: 'Update BookInstance',
        book_list: books,
        selected_book: bookinstance.book._id,
        bookinstance: bookinstance,
        errors: errors.array(),
        layout: 'layout',
      });
      return;
    } else {
      // Data from form is valid. Update the record.
      const updatedBookInstance = await BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {});

      // Successful - redirect to bookinstance detail page.
      res.redirect(updatedBookInstance.url);
    }
  }),
];