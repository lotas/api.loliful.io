'use strict';

class ApiError extends Error {
    constructor(msg, code) {
        super(msg, code);
        this.statusCode = code;
    }
}

module.exports = {
	authRequired: authRequired,
	permissionDenied: permissionDenied,
	exception: exception,
	notFound: notFound,
    validation: validationError
};


/**
 *
 * @param {String} msg
 * @returns {ApiError}
 */
function authRequired(msg) {
    return new ApiError(msg || 'Not authorized', 401);
}

/**
 *
 * @param {String} msg
 * @param {Integer} code
 * @returns {ApiError}
 */
function exception(msg, code) {
    return new ApiError(msg || 'Something bad happened', code || 500);
}

/**
 *
 * @param {String} msg
 * @returns {ApiError}
 */
function permissionDenied(msg) {
    return new ApiError(msg || 'Permission denied', 403);
}

/**
 *
 * @param {String} msg
 * @returns {ApiError}
 */
function notFound(msg) {
    return new ApiError(msg || 'Not found', 404);
}

/**
 *
 * @param {String} msg
 * @param {Integer} code
 * @returns {ApiError}
 */
function validationError(msg, code) {
    return new ApiError(msg || 'Precondition failed', code || 412);
}
