const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();


//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6x5bkid.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log(authorization);
    if (!authorization) {
        return res.status(401).send({ error: true, message: "unauthorized access" })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: "unauthorized access" })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {

        await client.connect();

        const serviceCOllection = client.db("carDoctor").collection('services');
        const bookingCollection = client.db('carDoctor').collection('bookings');

        //jwt

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
                expiresIn: '1h'
            })
            res.send({ token })
        })

        //services routes
        app.get('/services', async (req, res) => {
            const sort = req.query.sort
            const search = req.query.search
            const query = { title: { $regex: search, $options: 'i' } };
            const options = {
                sort: {
                    "price": sort == 1 ? 1 : -1
                }
            }
            const result = await serviceCOllection.find(query, options).toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: {
                    title: 1,
                    price: 1,
                    service_id: 1,
                    img: 1,
                }
            }
            const result = await serviceCOllection.findOne(query, options);
            res.send(result);
        })

        //bookings routes

        app.get('/bookings', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log(decoded);

            if (decoded.email !== req.query?.email) {
                return res.send({ error: true, message: "Forbidden access" })
            }

            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })


        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })


        app.patch('/bookings/:id', async (req, res) => {
            const updateBookings = req.body;
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: updateBookings.status
                },
            };

            const result = await bookingCollection.updateOne(query, updateDoc);
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally { }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Doctor is running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is running on port ${port}`);
})