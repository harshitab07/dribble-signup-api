const express=require('express');
const app=express();
const dotenv=require('dotenv')
const SignupRouter=require('./routes/signup');
const cors=require('cors');
const  helmet = require('helmet');
dotenv.config();


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
  app.use(cors({ origin: 'https://pixel-verse-frontend.vercel.app' }))

app.use('/api/signup',SignupRouter)
  
app.listen(process.env.PORT,()=>{
    console.log("Server connected..");
})
