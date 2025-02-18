export const testRegex = "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|js?|tsx?|ts?)$";
export const transform = {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.mjs$": "babel-jest"
};
export const testPathIgnorePatterns = ["<rootDir>/build/", "<rootDir>/node_modules/"];
export const moduleFileExtensions = ["js", "jsx", "mjs"];
export const transformIgnorePatterns = ["node_modules/(?!@ngrx|(?!exifr)|ng-dynamic)"]