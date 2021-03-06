#!/usr/bin/env node

/**
 * This script gathers current orbital data from the SpaceTrack API,
 * and updates the current orbital position for each payload.
 */

const MongoClient = require('mongodb');
const request = require('request-promise-native').defaults({ jar: true });

// Using an async foreach so we can use request promises in each payload
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    // Allow await for nested async functions
    // eslint-disable-next-line no-await-in-loop
    await callback(array[index], index, array);
  }
}

(async () => {
  let client;
  let orbitData;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  } catch (err) {
    console.log(err.stack);
    process.exit(1);
  }

  const col = client.db('spacex-api').collection('launch');
  const data = await col.find({ upcoming: false }).sort({ flight_number: 1 });

  const id = [];
  await data.forEach(launch => {
    launch.rocket.second_stage.payloads.forEach(payload => {
      if (payload.norad_id !== undefined && payload.norad_id.length !== 0) {
        id.push(payload.norad_id[0]);
      }
    });
  });

  await request.post('https://www.space-track.org/ajaxauth/login', {
    form: {
      identity: process.env.LOGIN,
      password: process.env.PASSWORD,
    },
    json: true,
  });

  const start = async () => {
    try {
      orbitData = await request('https://www.space-track.org/basicspacedata/query/class/tle_latest/ORDINAL/1/orderby/NORAD_CAT_ID/epoch/>now-30/format/json');
    } catch (e) {
      console.log('Login Broken');
      process.exit(1);
    }
    const orbit = JSON.parse(orbitData);

    await asyncForEach(id, async num => {
      const specific_orbit = orbit.filter(satellite => {
        return parseInt(satellite.NORAD_CAT_ID, 10) === num;
      });

      if (specific_orbit[0] !== undefined && specific_orbit.length !== 0) {
        const update = {
          epoch: new Date(specific_orbit[0].EPOCH).toISOString(),
          mean_motion: parseFloat(specific_orbit[0].MEAN_MOTION),
          raan: parseFloat(specific_orbit[0].RA_OF_ASC_NODE),
          arg_of_pericenter: parseFloat(specific_orbit[0].ARG_OF_PERICENTER),
          mean_anomaly: parseFloat(specific_orbit[0].MEAN_ANOMALY),
          semi_major_axis_km: parseFloat(specific_orbit[0].SEMIMAJOR_AXIS),
          eccentricity: parseFloat(specific_orbit[0].ECCENTRICITY),
          periapsis_km: parseFloat(specific_orbit[0].PERIGEE),
          apoapsis_km: parseFloat(specific_orbit[0].APOGEE),
          inclination_deg: parseFloat(specific_orbit[0].INCLINATION),
          period_min: parseFloat(specific_orbit[0].PERIOD),
        };
        console.log(`Updating...${specific_orbit[0].OBJECT_NAME}`);
        console.log(update);
        await col.updateOne({ 'rocket.second_stage.payloads.norad_id': num }, {
          $set: {
            'rocket.second_stage.payloads.$.orbit_params.epoch': update.epoch,
            'rocket.second_stage.payloads.$.orbit_params.mean_motion': update.mean_motion,
            'rocket.second_stage.payloads.$.orbit_params.raan': update.raan,
            'rocket.second_stage.payloads.$.orbit_params.arg_of_pericenter': update.arg_of_pericenter,
            'rocket.second_stage.payloads.$.orbit_params.mean_anomaly': update.mean_anomaly,
            'rocket.second_stage.payloads.$.orbit_params.semi_major_axis_km': update.semi_major_axis_km,
            'rocket.second_stage.payloads.$.orbit_params.eccentricity': update.eccentricity,
            'rocket.second_stage.payloads.$.orbit_params.periapsis_km': update.periapsis_km,
            'rocket.second_stage.payloads.$.orbit_params.apoapsis_km': update.apoapsis_km,
            'rocket.second_stage.payloads.$.orbit_params.inclination_deg': update.inclination_deg,
            'rocket.second_stage.payloads.$.orbit_params.period_min': update.period_min,
          },
        });
      }
    });
  };
  await start();

  console.log(`${id.length} launch orbits updated!`);

  if (client) {
    client.close();
  }
})();
