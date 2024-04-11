const express = require('express')
const router = express.Router();
const bcrypt = require('bcrypt');
const {pool} = require('../connection/db');
const Users = require('../Schema/Users')
const cloudinary = require("../Cloudinary");
const multer = require("multer");
const { Resend } = require( 'resend');

const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

const resend = new Resend(process.env.EMAIL_API_KEY);

router.post('/',async (req, res) => {
  try {
    const client = await pool.connect();
    const checkTableQuery = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = 'users'
    )
    `;
    const { rows } = await client.query(checkTableQuery);
    const tableExists = rows[0].exists;
  
    if(!tableExists){
      await client.query(Users)
    }

      const { name, username, email, password } = req.body;

      const salt = await bcrypt.genSalt(10);
      const hashPass = await bcrypt.hash(password, salt);
      const insertQuery = await client.query(`INSERT INTO users (name, username, email, password_hash) VALUES ($1, $2, $3, $4)`, [name, username, email, hashPass]);

      res.status(200).send('Signed up successfully');

    } catch (error) {
        if(error.code==='23505'&&error.constraint==='users_username_key'){
            res.status(400).send('Username already Exists');
        }
        else if(error.code==='23505'&&error.constraint==="users_email_key"){
            res.status(400).send('Email already registered');
        }else{
          res.send(500).send("Internal Server Error")
          
        }
 
    }
  });

  // profile upload
  router.post('/setup-profile', upload.single('file'), async (req, res) => {
    const { email, loc } = req.body;
    try {
        if (req.file) {
            const pfpURL = await cloudinary.uploader.upload(req.file.path);
            const updateQuery = 'UPDATE users SET pfp=$1 WHERE email=$2';
            await pool.query(updateQuery, [pfpURL.secure_url, email]);
            res.status(200).json({ pfp: pfpURL.secure_url });
        } else if (loc) {
            const updateQuery = 'UPDATE users SET location=$1 WHERE email=$2';
            await pool.query(updateQuery, [loc, email]);
            res.status(200).json({ loc:loc });
          
        }else if(req.file&&loc){
          const pfpURL = await cloudinary.uploader.upload(req.file.path);
          const updateQuery = 'UPDATE users SET pfp=$1,location=$2 WHERE email=$3';
            await pool.query(updateQuery, [loc,pfpURL.secure_url, email]);
            res.status(200).json({ loc:loc,pfp:pfpURL });
         
        } 
        else {
            res.status(400).json({ error: 'Missing parameters' });
        }
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Internal Server Error' });
     
    }
});

// email verification
router.post('/email-send',async(req,res)=>{
const{data,error}=await resend.emails.send({
  from: 'onboarding@resend.dev',
  to:'harshitabhatt1730@gmail.com',
  subject: `Dribble Onboarding`,
  html: '<p> Congratulations! Your email has been verified!</p>'
});
 if (error) {
    return res.status(400).json({ error });
  }
  res.status(200).json({ data });
});

module.exports=router;