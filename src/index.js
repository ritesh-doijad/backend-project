import dotenv from 'dotenv';
dotenv.config();

import connectDb from './db/index.js';
import { app } from './app.js';

connectDb()
.then(()=>{
   app.listen(process.env.PORT || 8000,()=>{
         console.log(`server is  running on ${process.env.PORT}`);    
   })
})
.catch((err)=>{
    console.log("MONGODB connection error !!!",err); 
})
