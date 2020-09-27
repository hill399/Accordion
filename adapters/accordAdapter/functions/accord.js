/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const cwd = os.tmpdir();

const hasha = require('hasha');

const { Requester } = require('@chainlink/external-adapter');

const { Template } = require('@accordproject/cicero-core');
const { Clause } = require('@accordproject/cicero-core');
const { Engine } = require('@accordproject/cicero-engine');

const admzip = require("adm-zip");
const w3utils = require("web3-utils");

const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");
const { allowedNodeEnvironmentFlags } = require('process');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fomowallet.firebaseio.com"
});

const storage = new admin.storage();

const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

const getFileFromBucket = async (id) => {

  console.log('In getfile');
  let filePath = path.join(cwd, id);

  console.log('filepath:', filePath)
  const options = {
    destination: filePath
  }

  try {
    await storage.bucket('accordian').file(id).download(options);
  } catch (e) {
    console.log(e)
  }

  console.log(`Downloaded ${id}`);
  return filePath
}

const sendFileToBucket = async (path) => {
  await storage.bucket('accordian').upload(path, {
    gzip: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  }).catch((err) => {
    console.log(err)
    return false;
  });

  console.log(`Uploaded ${path}`);
}

const getSampleFromArchive = async (archive) => {
  let zip = new admzip(archive);
  let zipentries = zip.getEntries();

  for (let entry in zipentries) {
    if (zipentries[entry].entryName == 'text/sample.md') {
      return zipentries[entry].getData().toString('utf8');
    }
  }
};


const getRequestFromArchive = async (archive) => {
  let zip = new admzip(archive);
  let zipentries = zip.getEntries();

  for (let entry in zipentries) {
    if (zipentries[entry].entryName == 'request.json') {
      return zipentries[entry].getData().toString('utf8');
    }
  }
};

const deploySmartLegalContract = async (jobRunID, args) => {
  // User will pass bucket ID and both eth addresses that have commited on the SC and stake in contract

  console.info('============= START : Deploy Legal Contract ===========');

  const contractId = args[0];
  const sInsurer = w3utils.toChecksumAddress(args[1]);
  const sClient = w3utils.toChecksumAddress(args[2]);
  const sInsurerDeposit = w3utils.fromWei(args[3], 'ether');
  const sClientDeposit = w3utils.fromWei(args[4], 'ether');

  const ctaName = contractId + '.cta';

  return getFileFromBucket(ctaName).then(async (filePath) => {
    console.log('Got file from bucket...');

    // check that the template is valid
    console.log('main fp: ', filePath)
    const template = await Template.fromArchive(Buffer.from(fs.readFileSync(filePath)));
    console.info(`Loaded template: ${template.getIdentifier()}`);

    const clauseText = await getSampleFromArchive(filePath);

    // validate and save the contract data
    const clause = new Clause(template);
    clause.parse(clauseText);

    const clauseData = clause.getData();

    const cInsurer = w3utils.toChecksumAddress(clauseData.insurerAddr);
    const cClient = w3utils.toChecksumAddress(clauseData.clientAddr);

    const notDeployed = w3utils.padLeft('0x0000000000000000000000000000000000000000', 64);

    console.log('addrs: ', clauseData.insurerAddr, sInsurer, clauseData.clientAddr, sClient)
    // Validate the eth addresses against the contract template
    if (cInsurer !== sInsurer || cClient !== sClient) {
      console.log("Address mismatch");

      return {
        jobRunID,
        data: notDeployed,
        result: notDeployed,
        statusCode: 200
      }

    }

    // Validate the deposited fees against the contract
    if (Number(sInsurerDeposit) < clauseData.payout || Number(sClientDeposit) < clauseData.deposit) {
      console.log("Insufficient fees");

      return {
        jobRunID,
        data: notDeployed,
        result: notDeployed,
        statusCode: 200
      }
    }

    const request = await getRequestFromArchive(filePath);

    // Write request template to store
    let rPath = path.join(cwd, contractId + '-Request');
    await fs.writeFileSync(rPath, Buffer.from(request));
    await sendFileToBucket(rPath);

    // Write data to store
    let dPath = path.join(cwd, contractId + '-Data');
    await fs.writeFileSync(dPath, Buffer.from(JSON.stringify(clauseData)));
    await sendFileToBucket(dPath);

    // Initiate the template
    const engine = new Engine();
    const result = await engine.init(clause);
    console.info(`Response from engine execute: ${JSON.stringify(result)}`);

    // Hash state & data and return to contract
    let hash = hasha(Buffer.from(JSON.stringify(result.state)));
    let hashsub = '0x' + hash.substring(0, 15);

    // Write current state to store
    let sPath = path.join(cwd, contractId + '-State');
    await fs.writeFileSync(sPath, Buffer.from(JSON.stringify(result.state)));
    await sendFileToBucket(sPath);

    const ethRes = hashsub.padEnd(64, 'F');
    console.log(ethRes);

    console.info('============= END : Deploy Legal Contract ===========');
    // Check return types allowance
    return {
      jobRunID,
      data: ethRes, //true,
      result: ethRes, //true,
      statusCode: 200
    }
  })
};


const getWeatherReading = async (lat, lon) => {

  const appid = 'OMITTED';

  const url = 'http://api.openweathermap.org/data/2.5/weather'

  const params = {
    lat,
    lon,
    appid
  };

  const config = {
    url,
    params
  };

  // The Requester allows API calls be retry in case of timeout
  // or connection failure
  const resp = await Requester.request(config, customError)
    .then(response => {
      // It's common practice to store the desired value at the top-level
      //result key. This allows different adapters to be compatible with
      //one another.
      response.data.result = [];
      response.data.result[0] = Requester.validateResultNumber(response.data.main, ['temp'])
      response.data.result[1] = Requester.validateResultNumber(response.data, ['dt'])
      return response.data.result
    })

  resp[0] = resp[0] - 273.15;
  resp[1] = new Date(resp[1]).toISOString()

  return resp
}


const executeSmartLegalContract = async (jobRunID, args) => {
  console.info('============= START : Execute Legal Contract ===========');

  const contractId = args[0];
  const ctaName = contractId + '.cta';

  const filePath = await getFileFromBucket(ctaName);
  console.log('Got file from bucket...')

  const template = await Template.fromArchive(Buffer.from(fs.readFileSync(filePath)));

  const neutralPayout = w3utils.padLeft('0x0000000000000000000000000000000000000000', 64);

  // load data
  const dataAsBytes = await getFileFromBucket(`${contractId}-Data`);
  if (!dataAsBytes) {
    return {
      jobRunID,
      data: neutralPayout,
      result: neutralPayout,
      statusCode: 200
    }
  }

  // load state
  const stateAsBytes = await getFileFromBucket(`${contractId}-State`);
  if (!stateAsBytes) {
    return {
      jobRunID,
      data: neutralPayout,
      result: neutralPayout,
      statusCode: 200
    }
  }

  // load request
  const requestAsBytes = await getFileFromBucket(`${contractId}-Request`);
  if (!stateAsBytes) {
    return {
      jobRunID,
      data: neutralPayout,
      result: neutralPayout,
      statusCode: 200
    }
  }

  // parse the state
  const state = await JSON.parse(fs.readFileSync(stateAsBytes));

  // parse the state
  const data = await JSON.parse(fs.readFileSync(dataAsBytes));

  // parse the request
  const request = await JSON.parse(fs.readFileSync(requestAsBytes));

  // get relevant weather reading
  const resp = await getWeatherReading(data.locLat, data.locLon);

  // destructure
  const reading = resp[0];
  const ts = resp[1];

  // set the new values in the request JSON
  //console.log(request)
  request.reading = reading;
  request.ts = ts;

  // set the clause data
  const clause = new Clause(template);
  clause.setData(data);

  // execute the engine
  const engine = new Engine();
  const result = await engine.trigger(clause, request, state);
  console.info(`Response from engine execute: ${JSON.stringify(result)}`);

  // Hash state & data and return to contract
  let hash = hasha(Buffer.from(JSON.stringify(result.state)));
  let hashsub = '0x' + hash.substring(0, 15);
  console.log('hs: ', hashsub);

  // save the state
  let sPath = path.join(cwd, contractId + '-State');
  await fs.writeFileSync(sPath, Buffer.from(JSON.stringify(result.state)));
  await sendFileToBucket(sPath);

  // save the request
  let rPath = path.join(cwd, `${contractId}-${hash.substring(0, 15)}`);
  await fs.writeFileSync(rPath, Buffer.from(JSON.stringify(result.response)));
  await sendFileToBucket(rPath);

  // return the response
  console.info('============= END : Execute Legal Contract ===========');

  const strAddr = result.response.payoutAddr.substring(2);

  // May need another zero
  const ethRes = hashsub + '00000000' + strAddr;

  return {
    jobRunID,
    data: ethRes,
    result: ethRes,
    statusCode: 200
  }
}

module.exports.deploySmartLegalContract = deploySmartLegalContract;
module.exports.executeSmartLegalContract = executeSmartLegalContract;
