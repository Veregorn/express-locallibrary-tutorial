const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const Schema = mongoose.Schema;

const BookInstanceSchema = new Schema({
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, // Reference to the associated book.
    imprint: { type: String, required: true }, // Specific imprint of the book.
    status: {
        type: String,
        required: true,
        enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'],
        default: 'Maintenance'
    },
    due_back: { type: Date, default: Date.now }
});

// Virtual for this bookinstance object's URL.
BookInstanceSchema
    .virtual('url')
    .get(function () {
        // We don't use arrow functions here because we need the 'this' object
        return '/catalog/bookinstance/' + this._id;
    });

// Virtual for formatted date
BookInstanceSchema
    .virtual('due_back_formatted')
    .get(function () {
        return DateTime.fromJSDate(this.due_back).toLocaleString(DateTime.DATE_MED);
    });

// Virtual for formatted due date (YYYY-MM-DD)
BookInstanceSchema
    .virtual('due_back_yyyy_mm_dd')
    .get(function () {
        return DateTime.fromJSDate(this.due_back).toISODate();
    });

// Export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);