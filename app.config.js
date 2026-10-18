const { expo } = require('./app.json');

module.exports = () => {
  const personalTeam = process.env.CAREQUEUE_IOS_PERSONAL_TEAM === '1';
  return {
    ...expo,
    // Keep the native notifications library, but skip its APNs entitlement for
    // local iOS builds signed by a free Apple Personal Team.
    plugins: personalTeam
      ? expo.plugins.filter((plugin) =>
          (Array.isArray(plugin) ? plugin[0] : plugin) !== 'expo-notifications')
      : expo.plugins,
  };
};
