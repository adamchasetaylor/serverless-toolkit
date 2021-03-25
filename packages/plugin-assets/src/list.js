const { TwilioServerlessApiClient } = require('@twilio-labs/serverless-api');
const {
  getEnvironment,
} = require('@twilio-labs/serverless-api/dist/api/environments');
const { getBuild } = require('@twilio-labs/serverless-api/dist/api/builds');

const ora = require('ora');
const { ConfigStore } = require('./configStore');
const { createErrorHandler } = require('./errors');

const debug = require('debug')('twilio:assets:list');
const spinner = ora();
const handleError = createErrorHandler(debug, spinner);

const list = async ({ configDir, apiKey, apiSecret, accountSid }) => {
  let environment;
  spinner.start('Loading config');
  const configStore = new ConfigStore(configDir);
  const config = await configStore.load();
  if (config[accountSid]?.serviceSid && config[accountSid]?.environmentSid) {
    const { serviceSid, environmentSid } = config[accountSid];
    const client = new TwilioServerlessApiClient({
      username: apiKey,
      password: apiSecret,
    });
    spinner.text = 'Fetching asset URLs';
    try {
      environment = await getEnvironment(environmentSid, serviceSid, client);
    } catch (error) {
      handleError(error, 'Could not fetch asset service environment');
      return;
    }
    if (environment.build_sid) {
      try {
        const build = await getBuild(environment.build_sid, serviceSid, client);
        spinner.stop();
        build.asset_versions.forEach(assetVersion => {
          console.log(`https://${environment.domain_name}${assetVersion.path}`);
        });
      } catch (error) {
        handleError(
          error,
          'Could not fetch last build of asset service environment'
        );
        return;
      }
    } else {
      spinner.fail('No assets deployed');
    }
  } else {
    spinner.fail(
      'No Service Sid or Environment Sid provided. Make sure you run twilio assets:init before listing your assets'
    );
  }
};

module.exports = { list };
