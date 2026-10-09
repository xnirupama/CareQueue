const path=require('node:path');
const {getDefaultConfig}=require('expo/metro-config');
const config=getDefaultConfig(__dirname);
if(!config.resolver.assetExts.includes('svg'))config.resolver.assetExts.push('svg');
// Build/document caches are not application sources. Keep Metro from indexing
// the Python environment, Gradle downloads and generated native files.
const root=__dirname.split(path.sep).map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[/\\\\]');
const generated=new RegExp(`^${root}[/\\\\](?:tmp|output|android|ios)[/\\\\]`);
const existing=config.resolver.blockList;
config.resolver.blockList=[...(Array.isArray(existing)?existing:existing?[existing]:[]),generated];
module.exports=config;
