const Book = require('../models/book');
const BookInstance = require('../models/bookInstance');
const Author = require('../models/author');
const Genre = require('../models/genre');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const book = require('../models/book');

exports.index = asyncHandler(async (req, res) => { // If any of the promises are rejected, the error will be passed to the 'next' function (which will handle it)
    // Get details of books, book instances, authors and genre counts (in parallel)
    const [
        numBooks,
        numBookInstances,
        numAvailableBookInstances,
        numAuthors,
        numGenres,
    ] = await Promise.all([ // 'Promise.all' waits for all promises to resolve and returns an array of the results
        Book.countDocuments({}).exec(), // 'countDocuments' returns the number of documents that match the query (a Query object) as a promise (exec() is required to actually execute the query)
        BookInstance.countDocuments({}).exec(),
        BookInstance.countDocuments({ status: 'Available' }).exec(),
        Author.countDocuments({}).exec(),
        Genre.countDocuments({}).exec(),
    ]);

    res.render('index', { // Pass the results to the 'layout' template
        book_count: numBooks,
        book_instance_count: numBookInstances,
        book_instance_available_count: numAvailableBookInstances,
        author_count: numAuthors,
        genre_count: numGenres,
        layout: 'layout',
    });
});

// Display list of all Books.
exports.book_list = asyncHandler(async (req, res) => {
    const books = await Book.find({}, 'title author') // Only title and author fields are returned
        .sort({ title: 1 }) // Sort by title in ascending order
        .populate('author') // 'populate' replaces the author id with the actual author details
        .exec(); // 'exec' is required to actually execute the query and return a promise

    res.render('book_list', {
        title: 'Book List',
        book_list: books,
        layout: 'layout',
    });
});

// Display detail page for a specific book.
exports.book_detail = asyncHandler(async (req, res, next) => {
    // Get details of books, book instances, authors and genre counts (in parallel)
    const [book, bookInstances] = await Promise.all([
        Book.findById(req.params.id).populate('author').populate('genre').exec(),
        BookInstance.find({ book: req.params.id }).exec(),
    ]);
    
    if (book === null) {
        const err = new Error('Book not found');
        err.status = 404;
        return next(err);
    }

    res.render('book_detail', { 
        book: book, 
        book_instances: bookInstances,
        layout: 'layout',
    });
});

// Display book create form on GET.
exports.book_create_get = asyncHandler(async (req, res) => {
    // Get all authors and genres, which we can use for adding to our book
    const [authors, genres] = await Promise.all([
        Author.find().sort({ family_name: 1 }).exec(),
        Genre.find().sort({ name: 1 }).exec(),
    ]);

    res.render('book_form', { 
        title: 'Create Book',
        authors: authors,
        genres: genres,
        book: null,
        errors: null,
        layout: 'layout',
    });
});

// Handle book create on POST.
exports.book_create_post = [
    // Convert the genre to an array
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    // Validate and sanitize fields
    body('title', 'Title must not be empty.')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('author', 'Author must not be empty.')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('summary', 'Summary must not be empty.')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('isbn', 'ISBN must not be empty.')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('genre.*').escape(), // use a wildcard (*) in the sanitizer to individually validate each of the genre array entries

    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
        // Extract the validation errors from a request
        const errors = validationResult(req);

        // Create a Book object with escaped and trimmed data
        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre,
        });

        if (!errors.isEmpty()) {
            // There are errors. Render the form again with sanitized values/error messages

            // Get all authors and genres for form
            const [authors, genres] = await Promise.all([
                Author.find().sort({ family_name: 1 }).exec(),
                Genre.find().sort({ name: 1 }).exec(),
            ]);

            // Mark our selected genres as checked
            for (const genre of genres) {
                if (book.genre.includes(genre._id)) {
                    genre.checked = 'true';
                }
            }

            res.render('book_form', { 
                title: 'Create Book',
                authors: authors,
                genres: genres,
                book: book,
                errors: errors.array(),
                layout: 'layout',
            });
            return;
        }

        try {
            await book.save();
            res.redirect(book.url);
        }
        catch (err) {
            next(err);
        }
    }),
]

// Display book delete form on GET.
exports.book_delete_get = asyncHandler(async (req, res, next) => {
    // Get details of book and all book instances (in parallel)
    const [book, allInstancesByBook] = await Promise.all([
        Book.findById(req.params.id).exec(),
        BookInstance.find({ book: req.params.id }).exec(),
    ]);

    if (book === null) {
        // No results
        res.redirect('/catalog/books');
    }

    res.render('book_delete', { 
        title: 'Delete Book', 
        book: book,
        book_instances: allInstancesByBook,
        layout: 'layout',
    });
});

// Handle book delete on POST.
exports.book_delete_post = asyncHandler(async (req, res, next) => {
    // Get book and book instances by book (in parallel)
    const [book, allInstancesByBook] = await Promise.all([
        Book.findById(req.params.id).exec(),
        BookInstance.find({ book: req.params.id }).exec(),
    ]);

    if (allInstancesByBook.length > 0) {
        // Book has book instances. Render in same way as for GET route
        res.render('book_delete', {
            title: 'Delete Book',
            book: book,
            book_instances: allInstancesByBook,
            layout: 'layout',
        });
        return;
    } else {
        // Book has no book instances. Delete object and redirect to the list of books.
        await Book.findByIdAndDelete(req.body.bookid);
        res.redirect('/catalog/books');
    }
});

// Display book update form on GET.
exports.book_update_get = asyncHandler(async (req, res, next) => {
    // Get book, authors and genres for form
    const [book, allAuthors, allGenres] = await Promise.all([
        Book.findById(req.params.id).populate('author').exec(),
        Author.find().sort({ family_name: 1 }).exec(),
        Genre.find().sort({ name: 1}).exec(),
    ]);

    if (book === null) {
        // No results
        const err = new Error('Book not found');
        err.status = 404;
        return next(err);
    }

    // Mark our selected genres as checked
    allGenres.forEach((genre) => {
        if (book.genre.includes(genre._id)) genre.checked = "true";
    });

    res.render('book_form', {
        title: 'Update Book',
        book: book,
        authors: allAuthors,
        genres: allGenres,
        errors: null,
        layout: 'layout',
     });
});

// Handle book update on POST.
exports.book_update_post = [
    // Convert the genre to an array
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    // Validate and sanitize fields
    body('title', 'Title must not be empty.')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('author', 'Author must not be empty.')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('summary', 'Summary must not be empty.')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('isbn', 'ISBN must not be empty.')
        .trim()
        .isLength({ min: 1 })
        .escape(),

    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
        // Extract the validation errors from a request
        const errors = validationResult(req);

        // Create a Book object with escaped and trimmed data
        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: typeof req.body.genre === 'undefined' ? [] : req.body.genre,
            _id: req.params.id // This is required, or a new ID will be assigned!
        });

        if (!errors.isEmpty()) {
            // There are errors. Render the form again with sanitized values/error messages

            // Get all authors and genres for form
            const [authors, genres] = await Promise.all([
                Author.find().sort({ family_name: 1 }).exec(),
                Genre.find().sort({ name: 1 }).exec(),
            ]);

            // Mark our selected genres as checked
            for (const genre of genres) {
                if (book.genre.includes(genre._id)) {
                    genre.checked = 'true';
                }
            }

            res.render('book_form', { 
                title: 'Update Book',
                authors: authors,
                genres: genres,
                book: book,
                errors: errors.array(),
                layout: 'layout',
            });
            return;
        } else {
            // Data from form is valid. Update the record.
            const updatedBook = await Book.findByIdAndUpdate(req.params.id, book, {});

            // Successful - redirect to book detail page.
            res.redirect(updatedBook.url);
        }
    }),
];