import assert from 'node:assert/strict';
import {getPublicCourseUrl, isSpecificStudyCourseUrl} from './lib/video-public-url.mjs';

const setId = 'home_laundry_cleaning_basics_a1_a2';
assert.equal(getPublicCourseUrl({setId, supportLang:'EN', targetLang:'JA'}), 'https://flashcardsluna.com/en/courses/laundry-cleaning-basics/study/standard?langs=ja');
assert.equal(getPublicCourseUrl({setId, supportLang:'ES-419', targetLang:'ZH'}), 'https://flashcardsluna.com/es/courses/laundry-cleaning-basics/study/standard?langs=zh');
const polyglot = getPublicCourseUrl({setId, supportLang:'RU', targetLangs:['ZH','JA','KO']});
assert.equal(polyglot, 'https://flashcardsluna.com/ru/courses/laundry-cleaning-basics/study/standard?langs=zh%2Cja%2Cko');
assert.equal(isSpecificStudyCourseUrl(polyglot), true);
assert.equal(getPublicCourseUrl({setId:'home_furniture_basics_a1', supportLang:'EN', targetLang:'VI'}), 'https://flashcardsluna.com/en/courses/furniture-basics/study/standard?langs=vi');
console.log('Deck11 ordinary/Polyglot course URLs and Deck10 regression PASS');
