const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const GenreSchema = new Schema({
    name: { type: String, required: true, min: 3, max: 100 }
});

// Virtual for genre's URL
GenreSchema
    .virtual('url')
    .get(function () {
        // We don't use arrow functions here because we need the 'this' object
        return '/catalog/genre/' + this._id;
    });

// Export model
module.exports = mongoose.model('Genre', GenreSchema);