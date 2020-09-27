const functions = require('firebase-functions');
const { Validator } = require('@chainlink/external-adapter')
const deploySmartLegalContract = require('./accord').deploySmartLegalContract
const executeSmartLegalContract = require('./accord').executeSmartLegalContract

const customParams = {
  id: ['id'],
  func: ['func'],
  insurer: false,
  client: false,
  deposit: false,
  payout: false,
}

const createRequest = async (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)

  const pDeploy = [validator.validated.data.id, validator.validated.data.insurer, validator.validated.data.client, validator.validated.data.payout, validator.validated.data.deposit];
  const pExec = [validator.validated.data.id];

  let response;

  switch (validator.validated.data.func) {
    case 'deploy':
      return deploySmartLegalContract(validator.validated.id, pDeploy).then((result) => {
        callback(200, result);
      })

    case 'trigger':
      return executeSmartLegalContract(validator.validated.id, pExec).then((result) => {
        callback(200, result);
      })

    default:
      console.log('Invalid func...')
      callback(400);
  }
}



// This is a wrapper to allow the function to work with
// GCP Functions
exports.AccordAdapter = functions.https.onRequest((req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
});

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
