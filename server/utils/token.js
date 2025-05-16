const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Generates a JWT token for a user
 * @param {string} id - The user's ID
 * @returns {string} The generated JWT token
 */
const signToken = (id) => {
    return jwt.sign({ id }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn
    });
};

exports.signToken = signToken;