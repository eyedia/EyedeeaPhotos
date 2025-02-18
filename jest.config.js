const testRegex = "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|js?|tsx?|ts?)$";
const transform = {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.mjs$": "babel-jest"
};
const testPathIgnorePatterns = ["<rootDir>/build/", "<rootDir>/node_modules/"];
const moduleFileExtensions = ["js", "jsx", "mjs"];
const transformIgnorePatterns = ["node_modules/(?!@ngrx|(?!exifr)|ng-dynamic)"];

export default { testRegex, transform, testPathIgnorePatterns, moduleFileExtensions, transformIgnorePatterns };