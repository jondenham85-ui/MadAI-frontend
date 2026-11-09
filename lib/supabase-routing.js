/** @param {string} base @param {string[]} path @param {string} search */
function edgeUrl(base,path,search='') {
  if(path[0]!=='api'||path.length<2||path.some(p=>!p||p==='.'||p==='..'||/[\\/\x00-\x1f]/.test(p)))throw new Error('Invalid API path');
  const url=new URL('/functions/v1/madsi-api/'+path.slice(1).map(encodeURIComponent).join('/'),base);
  url.search=search;return url;
}
module.exports={edgeUrl};
