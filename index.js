const express = require('express');
const cors = require('cors')
require("dotenv").config()
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@clustercar.vrbgln0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   }
});

const verifyJWT = (req, res, next) => {
   console.log('hitting varify jwt');
   console.log(req.headers.authorization);
   const authorization = req.headers.authorization
   if (!authorization) {
      return res.status(401).send({ error: true, massege: 'unothorized access' })
   }
   const token = authorization.split(' ')[1]
   console.log('token inside varify zwt', token);
   // verify a token symmetric
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
      if (error) {
         return res.status(401).send({ error: true, massege: 'unothorized access' })
      }
      req.decoded = decoded;
      next()
   });
}

async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();

      const serviceCollection = client.db("carDoctor").collection("services");
      const checkoutCollection = client.db("carDoctor").collection("checkout");

      // JWT
      app.post('/jwt', (req, res) => {
         const user = req.body
         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
         console.log(user, token);
         res.send({ token })
      });

      //services routes
      app.get('/services', async (req, res) => {
         const cursor = serviceCollection.find();
         const result = await cursor.toArray();
         res.send(result)
      });

      app.get('/services/:id', async (req, res) => {
         const id = req.params.id
         const query = { _id: new ObjectId(id) };
         const options = {
            projection: { title: 1, price: 1, service_id: 1, img: 1 }
         };

         const result = await serviceCollection.findOne(query, options);
         res.json(result);
      });
      // chckout routes
      app.post('/checkout', async (req, res) => {
         const order = req.body;
         console.log(order);
         const result = await checkoutCollection.insertOne(order);
         res.send(result)
      });

      app.get('/checkout', verifyJWT, async (req, res) => {
         const decoded = req.decoded;

         console.log(req.headers.authorization, "00000", decoded);
         if (decoded.email !== req.query.email) {
            return res.status(403).send({ error: 1, massage: "forbidden access" })
         }
         let query = {}
         if (req.query?.email) {
            query = { email: req.query.email }
         }
         const result = await checkoutCollection.find(query).toArray();
         res.send(result)
      });

      app.delete('/checkout:id', async (req, res) => {
         const id = req.params.id
         const query = { _id: new ObjectId(id) };
         const result = await checkoutCollection.deleteOne(query);
         res.send(result)
      })
      app.patch('/checkout:id', async (req, res) => {
         const id = req.params.id
         const updatebooking = req.body;

         const filter = { _id: new ObjectId(id) };
         const updateDoc = {
            $set: {
               status: updatebooking.status
            },
         };
         console.log(updateDoc);
         const result = await checkoutCollection.updateOne(filter, updateDoc);
         res.send(result)
      })



      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
   }
}
run().catch(console.dir);



app.get('/', (req, res) => {
   res.send('doctor is running !');
});

app.listen(port, () => {
   console.log(`car doctor server is running on port ${port}`);
});
