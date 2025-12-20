const express= require('express')

const app=express();
const cors = require('cors');

//mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//jwt
const admin = require("firebase-admin");


//environment variable
 require('dotenv').config();


 //stripe 
const stripe = require('stripe')(process.env.STRIPE_SECRET);


const port=process.env.PORT||3000
   
//middleware

   app.use(cors());
   app.use(express.json());


console.log('Stripe key loaded:',process.env.STRIPE_SECRET);

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
                          
                          const userPackageCollection=database.collection('packageData')
                      
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
                      

                       //package details page   
                          app.post('/packageDetails',verifyFBToken,async(req,res)=>{

                            const query=req.body;
                            const result=await userPackageCollection.insertOne(query);
                            res.send(result);
                          })


                        app.get('/packageDetails/email',verifyFBToken,async(req,res)=>{
                                 const email=req.query.email;
                                  
                                 const query={};

                                 if(email){
                                  query.email=email
                                 }
                                 const result=await userPackageCollection.find(query).sort({createdAt:-1}).toArray();
                                 res.send(result)
                        })

                        app.delete('/packageRemove/:id',async(req,res)=>{
                            const id=req.params.id;

                            const query={_id: new ObjectId(id)};

                            const result=await userPackageCollection.deleteOne(query);
                            res.send(result);
                        })


                        //stripe api

                        app.post('/create-checkout-session',async(req,res)=>{

                          const paymentInfo=req.body;
                           const amount= parseInt(paymentInfo.totalCost) ;
                          const session = await stripe.checkout.sessions.create({
                                  line_items: [
                                    {
                                   // Provide the exact Price ID (for example, price_1234) of the product you want to sell
                                   price_data:{
                                           currency:'USD',
                                            unit_amount:amount*100,
                                           product_data:{
                                               name:paymentInfo.packageName
                                           }
                                   },
                               
                                 quantity: 1,
                                      },
                                     ],

                                customer_email:paymentInfo.customer_email,
                                metadata:{
                                    packageId:paymentInfo.packageId
                                } ,
                                mode: 'payment',
                                success_url: `${process.env.SITE_DOMAIN}/dashboard/success`,

                                cancel_url: `${process.env.SITE_DOMAIN}/dashboard/cancel`,
                                })

                                 console.log(session);
                                 res.send({url:session.url})

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