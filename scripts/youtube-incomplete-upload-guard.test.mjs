import assert from "node:assert/strict";
import { assertIncompleteUploadPair } from "./lib/youtube-incomplete-upload-guard.mjs";
const keep={id:"QPfNgPnUTbY",snippet:{title:"fixture"},status:{uploadStatus:"processed"},contentDetails:{duration:"PT6M"}};
const remove={id:"Dol8GLzDtt0",snippet:{title:"fixture"},status:{privacyStatus:"private",uploadStatus:"uploaded"},contentDetails:{duration:"PT0S"},statistics:{viewCount:"0"}};
assert.equal(assertIncompleteUploadPair({keep,remove,title:"fixture"}).verifiedIncomplete,true);
for(const change of [{status:{privacyStatus:"private",uploadStatus:"processed"}},{status:{privacyStatus:"public",uploadStatus:"uploaded"}},
  {contentDetails:{duration:"PT6M"}},{fileDetails:{fileSize:"12"}},{fileDetails:{videoStreams:[{}]}},
  {processingDetails:{processingStatus:"succeeded"}},{statistics:{viewCount:"1"}},{snippet:{title:"different"}}]) {
  assert.throws(()=>assertIncompleteUploadPair({keep,remove:{...remove,...change},title:"fixture"}));
}
assert.throws(()=>assertIncompleteUploadPair({keep:{...keep,status:{uploadStatus:"uploaded"}},remove,title:"fixture"}));
console.log("incomplete upload deletion guard tests passed");
