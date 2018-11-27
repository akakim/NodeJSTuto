'use strict'


const functions         = require('firebase-functions');
const admin             = require('firebase-admin');

admin.initializeApp();

const express           = require('express');
const cookieParser      = require('cookie-parser')();
const cors              = require('cors')({origin: true});
const app               = express();

// google authenticated json api

const language              = require('@google-cloud/language');
const client                = language.LanguageServiceClient();
const testApp               = express();

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});


// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
// 서버로 데이터 삽입
exports.addMessage = functions.https.onRequest((req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  return admin.database().ref('/messages').push({original: original}).then((snapshot) => {
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    return res.redirect(303, snapshot.ref.toString());
  });
});


//Listens for new messages added to /messages/:pushId/original and creates an 
// uppercase version of the message to /messaghes/:pushId/uppercase

exports.makeUppercase = functions.database.ref('/messages/{pushId}/original')
    .onCreate((snapshot, context) => {
      // Grab the current value of what was written to the Realtime Database.
      const original = snapshot.val();
      console.log('Uppercasing', context.params.pushId, original);
      const uppercase = original.toUpperCase();
      const up = original.toUpperCase();
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to the Firebase Realtime Database.
      // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
      return snapshot.ref.parent.child('uppercase').set(uppercase);
    });

// Keep track of the leng of the 'likes; child list in a seperate property
exports.countlikechange = functions.database.ref('/posts/{postid}/likes/{likeid}').onWrite(
    (change) => {
        const collectionRef = change.after.ref.parent;
        const countRef = collectionRef.parent.child('likes_count');

        let increment;
        if (change.after.exists() && !change.before.exists()) {
            increment = 1;
        } else if (!change.after.exists() && change.before.exists()) {
            increment = -1;
        } else {
            return null;
        }

        // Return the promise from countRef.transaction() so our function
        // waits for this async event to complete before it exits.
        return countRef.transaction((current) => {
            return (current || 0) + increment;
        }).then( ()=>{

            return console.log('Counter update');
           }

        );
    });

// If the number of likes gets deleted, recount the number of likes

exports.recountlikes =  functions.database.ref('/posts/{postid}/likes_count').onDelete( (snap) =>{

    const counterRef =  snap.ref;
    const collectionRef = counterRef.parent.child('likes');

    // return the promise from counterRef.set() so our function
    // waits for this async event to complete before it exits
    return collectionRef.once('value')
        .then( (messagesData) => counterRef.set(messagesData.numChildren() ));
});

//Express middleware that validates Firebase ID Tokens passed in Authorization HTTP header
// The Firebase ID Token need to be passed as a Bearer Token in th Authorization HTTP header like this :
// Authorization : Bearer < Firebase ID Token >
// when decoded successfully, the ID Tokencontent will be added as 'req.user'.

const validateFirebaseIdToken = (req, res, next ) => {
   console.log('check if request is authorized with firebase ID token ');


   if( (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) &&
       !(req.cookie && req.cookies.__session)) {
       console.error('No Firebasae ID token was passed as a Bearer Token in the Authorization header ',
           'Makesure you authroize your request by providing the following HTTP header ');

        res.status(403).send('UnAuthrized');
       return;
   }

   let idToken;
   if( req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {

       console.log(' find "Authorization  " header')

       // read id Token from the authorization header
       idToken = req.headers.authorization.split('Bearer ')[1];

   }else if (req.cookies) {
       console.log('Found "session " cookies "')
       idToken = req.cookies.__session;
   }else {
       res.status(403).send('unauthorized');
       return;
   }

   admin.auth().verifyIdToken(idToken).then ( (decodedIdToken) => {
       console.log( 'ID Token correctly decoded ', decodedIdToken )
       req.user = decodedIdToken;
       return next();
    }).catch((error) => {
        console.error( 'error while verifying Firebase ID Token : ',error );
        res.status(403).send('Unauthorized');
    });

};


app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);
app.get('/firestHello', (req,res ) => {
   res.send( 'Hello ${req.user.name}');
});



//This Https endpoint can only be accessed by your Firebase users


exports.app = functions.https.onRequest( app );


// authenticate

// express middleware that valid firebase ID TOken passed in the Authorization HTTP header
// the firebase ID token need to be passed as a bearer token in the authorization HTTP header.
// like this :
// 'authorization : Bearer <Firebase ID Token>'
// when decodded successfully, the ID Token content will be added as 'req.user'


const authenticate = (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        res.status(403).send('Unauthorized');
        return;
    }

    const idToken = req.headers.authorization.splice('Bearer')[1];
    admin.auth().verifyIdToken(idToken).then((decodedIdToken) => {
        req.user = decodedIdToken;
        return next();
    }).catch(() => {
        res.status(403).send('Unauthorized');
    });
}

testApp.use(authenticate);

//POST /api/messages

// create a new message, get its sentiment using google cloud NLP
// and categorize the sentiment before saving

testApp.post('/messages',(req,res) => {
        const message = req.body.message;

        client.analyzeSentiment({document: message}).then((results) => {
            const category = categorizeScore(results[0].documentSentiment.score);
            const data = {message: message, sentiment: results, category: category};
            return admin.database().ref(`/users/${req.user.uid}/messages`).push(data);
        }).then((snapshot) => {
            return snapshot.ref.once('value');
        }).then((snapshot) => {
            const val = snapshot.val();
            return res.status(201).json({message: val.message, category: val.category});
        }).catch((error) => {
            console.log('Error detecting sentiment or saving message', error.message);
            res.sendStatus(500);
        });
    });

// GET /api/messages?category={category}
// Get all messages, optionally specifying a category to filter on
testApp.get('/messages', (req, res) => {
    const category = req.query.category;
    let query = admin.database().ref(`/users/${req.user.uid}/messages`);

    if (category && ['positive', 'negative', 'neutral'].indexOf(category) > -1) {
        // Update the query with the valid category
        query = query.orderByChild('category').equalTo(category);
    } else if (category) {
        return res.status(404).json({errorCode: 404, errorMessage: `category '${category}' not found`});
    }

    return query.once('value').then((snapshot) => {
        let messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({key: childSnapshot.key, message: childSnapshot.val().message});
        });

        return res.status(200).json(messages);
    }).catch((error) => {
        console.log('Error getting messages', error.message);
        res.sendStatus(500);
    });
});

// GET /api/message/{messageId}
// Get details about a message
testApp.get('/message/:messageId', (req, res) => {
    const messageId = req.params.messageId;
    admin.database().ref(`/users/${req.user.uid}/messages/${messageId}`).once('value').then((snapshot) => {
        if (snapshot.val() === null) {
            return res.status(404).json({errorCode: 404, errorMessage: `message '${messageId}' not found`});
        }
        return res.set('Cache-Control', 'private, max-age=300');
    }).catch((error) => {
        console.log('Error getting message details', messageId, error.message);
        res.sendStatus(500);
    });
});
testApp.get('/message/:messageId',(req,res) =>{


    }
)
// Expose the API as a function
exports.api = functions.https.onRequest(testApp);

// Helper function to categorize a sentiment score as positive, negative, or neutral
const categorizeScore = (score) => {
    if (score > 0.25) {
        return 'positive';
    } else if (score < -0.25) {
        return 'negative';
    }
    return 'neutral';
};
