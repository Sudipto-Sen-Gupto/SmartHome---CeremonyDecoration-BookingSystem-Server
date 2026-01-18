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


// console.log('Stripe key:',process.env.STRIPE_SECRET);

      // const serviceAccount = require("./smart-home-decoration-book.json");
          

        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

        admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
               });
            
        //tracking Id
        function generateTrackingId() {
  const prefix = "DECOR";
  const timestamp = Date.now().toString(36).toUpperCase(); // time-based
  const random = Math.random().toString(36).substring(2, 8).toUpperCase(); // randomness

  return `${prefix}-${timestamp}-${random}`;
}



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
                          // await client.connect();
                          // await client.db('admin').command({ping:1})
                          console.log("Pinged your deployment. You successfully connected to MongoDB!");


                          const database=client.db ('Decoration_Booking_DB');
                           
                          const decorationDataCollection=database.collection('decorationPackageData')

                          const mapLocationCollection= database.collection('locationData')
                          
                          const userPackageCollection=database.collection('packageData')

                          const paymentHistoryCollection=database.collection('paymentHistoryData');

                          const userDetails=database.collection('userData');

                          const decoratorDetails=database.collection('decoratorData');
                         
                          //users api


                            app.get('/users',async(req,res)=>{
                               
                                  const result=await userDetails.find().toArray();
                                  res.send(result);
                          })


                          app.post('/users',async(req,res)=>{
                                  
                                   const user=req.body;

                                   user.role='user';
                                   user.createdAt=new Date();
                                    
                                   const email=user.email;

                                   const emailExist=await userDetails.findOne({email})
                                   if(emailExist){
                                    return res.send({message:'email already exist'})
                                   }

                                   const result=await userDetails.insertOne(user);
                                   res.send(result);

                          });

                          

                          //decorator api

                          app.post('/decorators',async(req,res)=>{
                                     
                                   const decorInfo=req.body;
                                   decorInfo.status='pending',
                                   decorInfo.createdAt=new Date()

                                   const result=await decoratorDetails.insertOne(decorInfo);
                                   res.send(result);
                          })

                          app.get('/decorators',async(req,res)=>{
                                  const status=req.query.status;
                                  const query={}

                                  if(status){
                                    query.status=status;
                                  }

                                  const result=await decoratorDetails.find(query).toArray();
                                  res.send(result);
                          })

                          app.patch('/decorators/:id',verifyFBToken,async(req,res)=>{
                               const id=req.params.id;
                               const query={_id:new ObjectId(id)}

                               const status=req.body.status;

                               const updateInfo={
                                     $set:{
                                          status:status
                                     }
                               }

                               const result=await decoratorDetails.updateOne(query,updateInfo);

                               if(status==='approved'){
                                const email=req.body.email;
                                const useQuery={email}

                                const updateUserRole={
                                  $set:{
                                       role:'rider'
                                  }
                                }

                                const updateResult=await userDetails.updateOne(useQuery,updateUserRole)

                                

                              return res.send({
                             decoratorUpdate: result,
                                userRoleUpdate: updateResult
                                });

                               }
                              return res.send(result);
                          })
                      
                    //  map API     
                          app.get('/maplocation',async(req,res)=>{
                                     
                                   const result=await mapLocationCollection.find().toArray();
                                   res.send(result)
                          })


                          //decoration package api

                          app.get('/decorPack',async(req,res)=>{

                            const {limit=0,skip=0}=req.query;
                            const limitNum=Number(limit);
                            const skipNum=Number(skip);
                            // console.log(limit,skip);
                             
                            const count=await decorationDataCollection.countDocuments();
                            const result=await decorationDataCollection.find().limit(limitNum).skip(skipNum).project({description:0}).toArray();
                            res.send({result,total:count})
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

                                  if(email!==req.decoded_email){
                                    return res.status(403).send({message:'forbidden'})
                                   }
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
                                    packageId:paymentInfo.packageId,
                                    packageName:paymentInfo.packageName
                                } ,
                                mode: 'payment',
                                success_url: `${process.env.SITE_DOMAIN}/dashboard/success?session_id={CHECKOUT_SESSION_ID}`,

                                cancel_url: `${process.env.SITE_DOMAIN}/dashboard/cancel`,
                                })

                                 console.log(session);
                                 res.send({url:session.url})

                          })

                     
                       const trackingId=generateTrackingId()

                          app.patch('/payment-success',async(req,res)=>{
                                 
                                 const sessionId=req.query.session_id;

                                 const session =await stripe.checkout.sessions.retrieve(sessionId)
                                 console.log(session);

                                 const transactionId=session.payment_intent;

                                 const query={transactionId:transactionId};

                                 const paymentExit=await paymentHistoryCollection.findOne(query);

                                 if(paymentExit){

                                return  res.send({message:'Already exist',transactionId,trackingId:paymentExit.trackingId})
                                 }
                                  
                                if(session.payment_status==='paid'){

                                       const id=session.metadata.packageId;

                                const query={_id: new ObjectId(id)};

                                const updateInfo={
                                  $set:{
                                          
                                      payment_status:'paid',
                                      trackingId:trackingId
                                  }
                                }

                                const result=await userPackageCollection.updateOne(query,updateInfo)
                                  
                                 const payment={
                                        
                                       amount:session.amount_total/100,
                                       customerEmail:session.customer_email,
                                       packageId:session.metadata.packageId,
                                       packageName:session.metadata.packageName,
                                       transactionId:session.payment_intent,
                                       trackingId:trackingId,
                                       paymentStatus:session.payment_status,
                                       paidAt:new Date()}
                                       
                                 

                             if(session.payment_status==='paid'){
                                    
                                   const resultPayment =await paymentHistoryCollection.insertOne(payment);
                                  
                                   res.send({success:true,modifyPackage:result,
                                    trackingId:trackingId,
                                    transactionId:session.payment_intent,
                                    paymentInfo:resultPayment});
                             }

                                
                                }

                                

                                 res.send({success:false})
                           })


                           app.get('/paymentHistory',verifyFBToken,async(req,res)=>{
                                  
                                  

                                   const email=req.query.email;

                                   
                                   const query={}

                                   if(email){
                                      
                                    if(email!==req.decoded_email){
                                    return res.status(403).send({message:'forbidden'})
                                   }

                                     query.customerEmail=email;
                                   }

                                   const result=await paymentHistoryCollection.find(query).sort({paidAt:-1}).toArray();
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