const express= require('express')

const app=express();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
//environment variable
 require('dotenv').config();

const port=process.env.PORT||3000
   
//middleware

   app.use(cors());
   app.use(express.json());


   

     const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6pjurty.mongodb.net/?appName=Cluster0`;

     const client = new MongoClient(uri, {
             serverApi: {
              version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
                  }
                  } );


       async function run(){
                         
                    try{
                          await client.connect();
                          await client.db('admin').command({ping:1})
                          console.log("Pinged your deployment. You successfully connected to MongoDB!");


                          const database=client.db ('Decoration_Booking_DB');

                          const mapLocationCollection= database.collection('locationData')


                          app.get('/maplocation',async(req,res)=>{
                                     
                                   const result=await mapLocationCollection.find().toArray();
                                   res.send(result)
                          })
                    }

                    finally{

                    }
       }           
        
     run().catch(console.dir);

app.get('/',(req,res)=>{
     res.send("Welcome to smart home and decoration booking system")
})

app.listen(port,()=>{
      console.log("Port move to",port);
})