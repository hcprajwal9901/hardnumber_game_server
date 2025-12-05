"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valid4UniqueDigits = valid4UniqueDigits;
function valid4UniqueDigits(s) {
    return (typeof s === 'string' &&
        /^\d{4}$/.test(s) &&
        new Set(s.split('')).size === 4);
}
