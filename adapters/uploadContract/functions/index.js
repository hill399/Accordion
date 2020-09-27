const functions = require('firebase-functions');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require("crypto");

// Imports the Google Cloud client library
const { Storage } = require('@google-cloud/storage');
const { Template, Clause } = require('@accordproject/cicero-core');
const admzip = require('adm-zip');

//const functions = require('firebase-functions');
const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://fomowallet.firebaseio.com"
});

// Creates a client
const storage = new Storage();

let filepath;
const fileWrites = [];

const getSampleFromArchive = async (archive) => {
    let zip = new admzip(archive);
    let zipentries = zip.getEntries();


    for (let entry in zipentries) {
        if (zipentries[entry].entryName == 'text/sample.md') {
            return zipentries[entry].getData().toString('utf8');
        }
    }
};

const uploadFile = async (req) => {
    if (req.method !== 'POST') {
        // Return a "method not allowed" error
        return res.status(405).end();
    }

    const busboy = new Busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();

    // This object will accumulate all the fields, keyed by their name
    const fields = {};

    // This object will accumulate all the uploaded files, keyed by their name.
    const uploads = {};

    let retname;

    // This code will process each non-file field in the form.
    busboy.on('field', (fieldname, val) => {
        // TODO(developer): Process submitted field values here
        console.log(`Processed field ${fieldname}: ${val}.`);
        fields[fieldname] = val;
    });

    // This code will process each file uploaded.
    busboy.on('file', async (fieldname, file, filename) => {
        // Note: os.tmpdir() points to an in-memory file system on GCF
        // Thus, any files in it must fit in the instance's memory.
        console.log(`Processed file ${filename}`);

        let id = crypto.randomBytes(20).toString('hex').toString()
        filename = id + ".cta"

        retname = id;

        filepath = path.join(tmpdir, filename);
        uploads[fieldname] = filepath;

        console.log('fld:', fieldname, 'fil:', filename)

        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);

        // File was processed by Busboy; wait for it to be written to disk.
        const promise = new Promise((resolve, reject) => {
            file.on('end', () => {
                writeStream.end();
            });
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        fileWrites.push(promise);
    });

    // Triggered once all uploaded files are processed by Busboy.
    // We still need to wait for the disk writes (saves) to complete.
    busboy.on('finish', () => {
        Promise.all(fileWrites).then(async () => {
            // TODO(developer): Process saved files here
            for (const name in uploads) {
                const file = uploads[name];
                async function upload2bucket() {
                    var bucketName = 'accordian'
                    fileRes = await storage.bucket(bucketName).upload(file);
                    //fs.unlinkSync(file);
                    console.log(`Finish: Processed file ${file}`);
                }
                upload2bucket()
            }
        })
    });

    busboy.end(req.rawBody);

    return retname;
}



exports.uploadContract = functions.https.onRequest(async (request, response) => {
    uploadFile(request).then(async (name) => {

        await Promise.all(fileWrites);

        const template = await Template.fromArchive(Buffer.from(fs.readFileSync(filepath)));
        const clauseText = await getSampleFromArchive(filepath);
        const clause = await new Clause(template);
        clause.parse(clauseText);

        let cd = clause.getData();

        cd["accId"] = name;

        response.set('Access-Control-Allow-Origin', "*")
        response.set('Access-Control-Allow-Methods', 'GET, POST')
        response.send({ "result": cd });
    })
});

