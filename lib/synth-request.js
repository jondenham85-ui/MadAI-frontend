/** @param {{id:string,fingerprint:string}|null} previous @param {string} fingerprint @param {()=>string} createId */
function nextAttempt(previous,fingerprint,createId=()=>crypto.randomUUID()){
  if(previous&&previous.fingerprint===fingerprint)return previous;
  return{id:createId(),fingerprint};
}
/** @param {number} status @param {string|undefined} code @param {string} message @param {boolean|undefined} refundPending */
function retryNeedsNewKey(status,code,message,refundPending){
  if(refundPending)return false;
  if(status===409&&message==='request_in_progress')return false;
  if(status>=400&&status<500)return true;
  return ['PROVIDER_TIMEOUT','PROVIDER_UNAVAILABLE','PROVIDER_REJECTED','PROVIDER_RATE_LIMITED','EMPTY_AI_RESPONSE'].includes(code||'');
}
module.exports={nextAttempt,retryNeedsNewKey};
