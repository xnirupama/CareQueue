const {defineConfig}=require('eslint/config');
const expo=require('eslint-config-expo/flat');
module.exports=defineConfig([expo,{ignores:['design/**','scripts/**','dist/**','firebase/**','tests/**','tmp/**','android/**','ios/**','output/**']}]);
