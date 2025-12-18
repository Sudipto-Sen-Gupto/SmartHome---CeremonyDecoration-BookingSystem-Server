const express= require('express')

const app=express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//jwt
const admin = require("firebase-admin");
//environment variable
 require('dotenv').config();

const port=process.env.PORT||3000
   
//middleware

   app.use(cors());
   app.use(express.json());



      const serviceAccount = require("./smart-home-decoration-book.json");

        admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
               });
   

         const verifyFBToken=async(req,res,next)=>{
               
                const authorization= req.headers.authorization

                if(!authorization){
               return   res.status(401).send({message:'unauthorized'})
                }
               
                const Token=authorization.split(' ')[1]

              if(!Token){
                return  res.status(401).send({message:'unauthorized'})
              }

             try{
                    
              const decode= await admin.auth().verifyIdToken(Token);
              console.log(decode);
              req.decoded_email=decode.email

             next();
             }   
               catch(err){
                     return res.status(401).send({message:'unauthorized'})
               }

         }


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
                           
                          const decorationDataCollection=database.collection('decorationPackageData')

                          const mapLocationCollection= database.collection('locationData')

                      
                    //  map API     
                          app.get('/maplocation',async(req,res)=>{
                                     
                                   const result=await mapLocationCollection.find().toArray();
                                   res.send(result)
                          })


                          //decoration package api

                          app.get('/decorPack',async(req,res)=>{
                             
                            const result=await decorationDataCollection.find().toArray();
                            res.send(result)
                          })

                          app.get('/decoration',async(req,res)=>{
                               
                            const result=await decorationDataCollection.find().limit(6).toArray();

                            res.send(result)
                          })


                          // viewDetail page api

                          app.get('/decorPack/:id',verifyFBToken,async(req,res)=>{
                                   
                                  const id=req.params.id;

                                  const query={_id: new ObjectId(id)};

                                  const result=await decorationDataCollection.findOne(query);

                                  res.send(result);
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