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

// Deck15 must resolve its published course, never the generic catalog.
assert.equal(getPublicCourseUrl({setId:'home_outdoor_garden_a2', supportLang:'EN', targetLang:'JA'}), 'https://flashcardsluna.com/en/courses/outdoor-home-garden/study/standard?langs=ja');
assert.equal(getPublicCourseUrl({setId:'home_outdoor_garden_a2', supportLang:'ES-419', targetLang:'VI'}), 'https://flashcardsluna.com/es/courses/outdoor-home-garden/study/standard?langs=vi');
const gardenPolyglot = getPublicCourseUrl({setId:'home_outdoor_garden_a2', supportLang:'SR', targetLangs:['PL','CS','UK']});
assert.equal(gardenPolyglot, 'https://flashcardsluna.com/sr/courses/outdoor-home-garden/study/standard?langs=pl%2Ccs%2Cuk');
assert.equal(isSpecificStudyCourseUrl(gardenPolyglot), true);
console.log('Deck15 ordinary/Polyglot published course binding PASS');
